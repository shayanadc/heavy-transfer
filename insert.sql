-- First drop existing objects
DROP PROCEDURE IF EXISTS insert_random_data;
DROP FUNCTION IF EXISTS random_string;

-- Set optimization parameters
SET SESSION bulk_insert_buffer_size = 536870912;
SET unique_checks = 0;
SET foreign_key_checks = 0;
SET autocommit = 0;

-- Create random string function
DELIMITER //
CREATE FUNCTION random_string(length INT)
RETURNS VARCHAR(255)
BEGIN
    DECLARE chars VARCHAR(255) DEFAULT 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    DECLARE result VARCHAR(255) DEFAULT '';
    DECLARE i INT DEFAULT 1;
    
    WHILE i <= length DO
        SET result = CONCAT(result, SUBSTRING(chars, FLOOR(1 + RAND() * 52), 1));
        SET i = i + 1;
    END WHILE;
    
    RETURN result;
END //
DELIMITER ;

-- Create insertion procedure with four-level cross join
DELIMITER //
CREATE PROCEDURE insert_random_data()
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE batch_size INT DEFAULT 10000;
    
    WHILE i <= 2000000 DO
        INSERT INTO origin_table (id, title)
        SELECT 
            i + number,
            CONCAT(random_string(8), '_', random_string(8))
        FROM (
            SELECT a.N + b.N * 10 + c.N * 100 + d.N * 1000 AS number
            FROM (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
                 (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b,
                 (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) c,
                 (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d
            LIMIT batch_size
        ) numbers;
        
        SET i = i + batch_size;
        
        IF (i % 100000) = 0 THEN
            COMMIT;
            SELECT CONCAT('Processed: ', i, ' rows');
        END IF;
    END WHILE;
    
    COMMIT;
END //
DELIMITER ;

-- Execute the procedure
CALL insert_random_data();

-- Clean up
DROP PROCEDURE insert_random_data;
DROP FUNCTION random_string;
SET unique_checks = 1;
SET foreign_key_checks = 1;
SET autocommit = 1;