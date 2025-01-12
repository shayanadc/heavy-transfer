import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT),
    waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS === 'true',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT),
    queueLimit: parseInt(process.env.DB_QUEUE_LIMIT)
});

function writeToDB(connection, values) {
    connection.query(`
        INSERT INTO destination_table (title1, title2)
        VALUES ?
    `, [values]);
}

function readFromDB(connection, page = 1, offset = 10000) {
    const firstId = (page - 1) * page + 1;
    const lastId = firstId + offset;

    return connection.query(`
        SELECT title
        FROM origin_table
        WHERE id >= ${firstId} and id < ${lastId}
    `);
}

function rowNormalization(rows) {
    return rows.map((row) => {
        const [title1, title2] = row.title.split('_');

        return [title1 || '', title2 || ''];
    });
}
async function perform(connection, page, batchSize) {
        return new Promise((resolve, reject) => {
            const immediate = setImmediate(async () => {
                try {
                    const [rows] = await readFromDB(connection, page, batchSize);
                    const values = rowNormalization(rows);
                    await writeToDB(connection, values);
                    console.log(`Processed batch ${page}, rows: ${rows.length}`);
                    resolve();
                } catch (error) {
                    reject(error);
                } finally {
                    clearImmediate(immediate);
                }
            });
        });
    }

async function transferData() {
    let connection;
    const dataSize = 2000000;
    const batchSize = 10000;
    const totalBatches = Math.ceil(dataSize / batchSize);

    try {
        connection = await pool.getConnection();
        
        for (let i = 0; i < totalBatches; i++) {
            await perform(connection, i, batchSize);
        }

    } catch (error) {
        console.error('Error during transfer:', error);
    } finally {
        if (connection) {
            connection.release();
        }
        await pool.end();
    }
}

transferData().catch(console.error);