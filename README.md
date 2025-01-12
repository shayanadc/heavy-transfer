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


- step 4(checkout step-4 branch):
The chunked parallel processing approach fundamentally changes how we handle large datasets by breaking down a large batch of records into smaller, manageable chunks that can be processed concurrently. Instead of processing records sequentially, which can lead to memory bottlenecks and slower execution times, this method leverages JavaScript's Promise.all to process multiple chunks simultaneously. The performance benefits come from three key aspects:
- Memory efficiency through controlled chunk sizes prevents the application from consuming excessive memory when processing large datasets
- Parallel processing of chunks maximizes CPU utilization and reduces overall processing time
- Connection pooling optimization by maintaining a single database connection while processing multiple chunks concurrently

- step 5(checkout step-5 branch):

Moving the title extraction logic from JavaScript to SQL represents a significant performance optimization in data processing. Instead of fetching complete titles and then splitting them in Node.js memory, we leverage MySQL's built-in string functions (SUBSTRING_INDEX) to perform this operation at the database level. This approach is more efficient because database engines are highly optimized for such string operations, and it reduces both the network payload and JavaScript memory footprint. When dealing with millions of records, this optimization can lead to substantial performance improvements since we're eliminating the need for JavaScript-based string manipulation (split('_')) on each row and reducing the amount of data transferred between the database and application. The database engine can also potentially utilize its internal optimizations and caching mechanisms while performing these string operations, making the overall process more efficient than handling it in application code.
