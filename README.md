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
