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
    return connection.query(`
        INSERT INTO destination_table (title1, title2)
        VALUES ?
    `, [values]);
}

function readFromDB(connection, page = 1, offset = 10000) {
    const firstId = (page - 1) * page + 1;
    const lastId = firstId + offset;

    return connection.query(`
        SELECT 
            COALESCE(SUBSTRING_INDEX(title, '_', 1), '') as title1,
            COALESCE(SUBSTRING_INDEX(title, '_', -1), '') as title2
        FROM origin_table
        WHERE id >= ${firstId} and id < ${lastId}
    `);
}

async function perform(connection, page, batchSize) {
    const [rows] = await readFromDB(connection, page, batchSize);
    
    const chunks = [];
    for (let i = 0; i < rows.length; i += batchSize) {
        chunks.push(rows.slice(i, i + batchSize));
    }

    await Promise.all(chunks.map(async (chunk) => {
        const values = chunk.map(row => [row.title1, row.title2]);
        await writeToDB(connection, values);
    }));

    console.log(`Processed batch ${page}, total rows: ${rows.length}`);
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