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


async function transferData() {
    try {
        const connection = await pool.getConnection();

        const [rows] = await connection.query('SELECT id, title FROM origin_table');
        console.log(`Fetched ${rows.length} rows from origin_table`);
        const values = rows.map((row) => {
            const [title1, title2] = row.title.split('_');

            return [title1 || '', title2 || ''];
        });
        await connection.query(`
            INSERT INTO destination_table (title1, title2)
            VALUES ?
        `, [values]);

    } catch (error) {
        console.error('Error during transfer:', error);
    } finally {
        if (connection) connection.release();
        await pool.end();
    }
}

transferData().catch(console.error);