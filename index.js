import { createPool } from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT),
    waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS === 'true',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT),
    queueLimit: parseInt(process.env.DB_QUEUE_LIMIT)
};

const pool = createPool(dbConfig);

function writeToDB(connection, values) {
    return new Promise((resolve)=>{

    connection.query(`
            INSERT INTO destination_table (title1, title2)
            VALUES ?
        `, [values]);
        resolve();
    }) 
}

function readFromDB(poolConnection) {
    const query = `
    SELECT 
        COALESCE(SUBSTRING_INDEX(title, '_', 1), '') as title1,
        COALESCE(SUBSTRING_INDEX(title, '_', -1), '') as title2
    FROM origin_table
    `;

    return poolConnection.query(query)
}
async function transferData() {
    let connection;
    const batchSize = 10000;

    try {
        connection = await pool.promise().getConnection();
        
        return new Promise((resolve, reject) => {
            let rows = [];
            let totalRows = 0;
            let writePromises = [];

            const poolQueryStrem = readFromDB(pool)            
            
            poolQueryStrem.stream()
            .on('data', (row) => {
                    rows.push([row.title1 || '', row.title2 || '']);
                    totalRows++;
                    
                    if (rows.length === batchSize) {
                        const batchRows = [...rows];
                        const writePromise = writeToDB(connection, batchRows)
                            .then(() => {
                                console.log(`Inserted batch of ${batchSize} rows`);
                            })
                            .catch(error => {
                                console.error('Error writing to DB:', error);
                                reject(error);
                            });
                        
                        writePromises.push(writePromise);
                        rows = [];
                    }
                })
                .on('end', async () => {
                    try {
                        await Promise.all(writePromises);
                        console.log(`Total rows processed: ${totalRows}`);
                        
                        connection.release();
                        pool.end();
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', (error) => {
                    console.error('Error during streaming:', error);
                    connection.release();
                    pool.end();
                    reject(error);
                });
        });
    } catch (error) {
        console.error('Error during transfer:', error);
        if (connection) {
            connection.release();
        }
        pool.end();
        throw error;
    }
}

transferData().catch(console.error);