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

async function writeToDB(connection, values) {
    await connection.query(`
        INSERT INTO destination_table (title1, title2)
        VALUES ?
    `, [values]);
}

async function readFromDB(connection, offset, limit) {
    return connection.query(
        'SELECT title FROM origin_table LIMIT ?, ?',
        [offset, limit]
    );
}

function rowNormalization(rows) {
    return rows.map((row) => {
        const [title1, title2] = row.title.split('_');
        return [title1 || '', title2 || ''];
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
            const [rows] = await readFromDB(connection, i * batchSize, batchSize);
            const values = rowNormalization(rows);
            await writeToDB(connection, values);
            console.log(`Processed batch ${i + 1}/${totalBatches}`);
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