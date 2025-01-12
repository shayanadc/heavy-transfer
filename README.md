# heavy-transfer

## Table Structure Documentation
##### Origin Table
```sql


CREATE TABLE origin_table (
    id INT PRIMARY KEY,
    title VARCHAR(255)
)
```

Simple table with an ID and title field
Title field contains values separated by underscore (e.g., "value1_value2")
#### Destination Table
```sql
CREATE TABLE destination_table (
    id INT PRIMARY KEY,
    title1 VARCHAR(255),
    title2 VARCHAR(255)
)
```
Target table that splits the original title into two separate columns
Has an auto-incrementing primary key

## Usage
Fill the .env file with your database credentials
Run the index.js file to run the script
Run the insert.sql file to load 2 million rows on your database

## Challenges
* Critical Issues
- Memory Overload Risk
- Attempting to load 2 million rows into memory at once
- No batch processing implementation
* Connection Management
- Connection variable scope issue between try and finally blocks
- Potential connection leaks if error occurs
* Performance Bottlenecks
- Single transaction for entire dataset
- No progress tracking
- Blocking operation that could impact database performance
* Data Integrity
- No validation of data format
- No handling of malformed title strings
- Missing transaction management for rollback scenarios


### Solutions 

- step 1(checkout step-1 branch):

Current Problem The original code was attempting to fetch all 2 million records at once:
javascript

```javascript
const [rows] = await connection.query('SELECT id, title FROM origin_table');
```

This approach leads to:
- High memory usage
- Potential application crashes
- Slower initial response time
- Database server strain
- Improved Approach The new implementation uses chunked data processing:

```javascript
const batchSize = 10000;
const totalBatches = Math.ceil(dataSize / batchSize);

for (let i = 0; i < totalBatches; i++) {
    const [rows] = await readFromDB(connection, i * batchSize, batchSize);
    // Process chunk
}
```

- step 2(checkout step-2 branch):

```sql
// Optimized Query (Using ID-based pagination)
// SELECT * FROM table LIMIT 10000, 1000
// When executing this query, MySQL must:
// Scan through the first 10,000 rows
// Discard them
// Then return the next 1,000 rows

SELECT title FROM origin_table WHERE id >= ? AND id <= ?
```
* Async Operations
* Non-blocking database operations
```javascript
   await perform(connection, i, batchSize);
```


- step 3(checkout step-3 branch):

Event Loop Deferral
setImmediate schedules the callback to execute in the next iteration of the event loop
Allows other I/O operations to be processed between heavy database operations

```javascript
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
                clearImmediate(immediate); // Cleanup the immediate
            }
        });
    });
}
```
* note to cleanup the immediate after the operation is completed