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

## Issue
- step 0(checkout step-0 branch):

in this stage of the programn we are facing the issue of memory overload due to the large dataset size.

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


- step 4(checkout step-4 branch):
The chunked parallel processing approach fundamentally changes how we handle large datasets by breaking down a large batch of records into smaller, manageable chunks that can be processed concurrently. Instead of processing records sequentially, which can lead to memory bottlenecks and slower execution times, this method leverages JavaScript's Promise.all to process multiple chunks simultaneously. The performance benefits come from three key aspects:
- Memory efficiency through controlled chunk sizes prevents the application from consuming excessive memory when processing large datasets
- Parallel processing of chunks maximizes CPU utilization and reduces overall processing time
- Connection pooling optimization by maintaining a single database connection while processing multiple chunks concurrently

- step 5(checkout step-5 branch):

Moving the title extraction logic from JavaScript to SQL represents a significant performance optimization in data processing. Instead of fetching complete titles and then splitting them in Node.js memory, we leverage MySQL's built-in string functions (SUBSTRING_INDEX) to perform this operation at the database level. This approach is more efficient because database engines are highly optimized for such string operations, and it reduces both the network payload and JavaScript memory footprint. When dealing with millions of records, this optimization can lead to substantial performance improvements since we're eliminating the need for JavaScript-based string manipulation (split('_')) on each row and reducing the amount of data transferred between the database and application. The database engine can also potentially utilize its internal optimizations and caching mechanisms while performing these string operations, making the overall process more efficient than handling it in application code.


- step 6(checkout step-6 branch):

Using MySQL's native streaming capabilities with a pause/resume mechanism, it processes data in controlled batches (e.g., 1000 records at a time) instead of loading large chunks (e.g., 10,000 records) at once. This approach significantly reduces memory consumption and provides more stable performance, especially when processing millions of records, as it maintains a consistent memory footprint throughout the operation while ensuring efficient data processing.

in order to use the streaming capabilities of MySQL, you need to use mysql package instead promise-mysql to get the streaming capabilities
```javascript
import { createPool } from 'mysql2';
const pool = createPool(dbConfig);
```

in this implementation, we are getting the streamed data from the databas:

```javascript
        const poolQueryStrem = readFromDB(pool)            
        
        poolQueryStrem.stream()
        .on('data', (row) => {
                rows.push([row.title1 || '', row.title2 || '']);
```
and after that we are pushing the data to the database but in a different way:

```javascript
    const writePromise = writeToDB(connection, batchRows)
        .then(() => {
            console.log(`Inserted batch of ${batchSize} rows`);
        })
    
    writePromises.push(writePromise);
```

as the writeToDB function is returning a promise, we are pushing it to the writePromises array, and after that we are waiting for all the promises to be resolved using Promise.all

```javascript
    Promise.all(writePromises)
```

### Future Improvements

*** Pre-generating IDs for database insertions 

it offers significant performance benefits by eliminating auto-increment operations and reducing database engine overhead, enabling faster batch processing and better parallelization. However, this optimization comes with increased code complexity and maintenance challenges, requiring careful ID management and uniqueness guarantees. The approach is particularly valuable for high-throughput scenarios where write performance is critical, but should be weighed against the additional development and maintenance overhead.


*** Recovering Partially Failed Inserts Without Duplication

When a data transfer operation partially fails, it's important to recover only the affected records without causing duplication.
Ensure that the destination table has unique constraints (like primary keys) on the columns being inserted. Have a mechanism to detect and recover from partial failures. This can be achieved by using a database transaction with rollback capabilities for insertion operations or generating the ids and storing them in a separate storage. We can periodically check the databse for missing ids and insert them into the database.

