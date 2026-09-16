-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `actor` (
	`actor_id` smallint unsigned AUTO_INCREMENT PRIMARY KEY,
	`first_name` varchar(45) NOT NULL,
	`last_name` varchar(45) NOT NULL,
	`last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `address` (
	`address_id` smallint unsigned AUTO_INCREMENT PRIMARY KEY,
	`address` varchar(50) NOT NULL,
	`address2` varchar(50),
	`district` varchar(20) NOT NULL,
	`city_id` smallint unsigned NOT NULL,
	`postal_code` varchar(10),
	`phone` varchar(20) NOT NULL,
	`location` geometry NOT NULL,
	`last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `category` (
	`category_id` tinyint unsigned AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(25) NOT NULL,
	`last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `city` (
	`city_id` smallint unsigned AUTO_INCREMENT PRIMARY KEY,
	`city` varchar(50) NOT NULL,
	`country_id` smallint unsigned NOT NULL,
	`last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `country` (
	`country_id` smallint unsigned AUTO_INCREMENT PRIMARY KEY,
	`country` varchar(50) NOT NULL,
	`last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `customer` (
	`customer_id` smallint unsigned AUTO_INCREMENT PRIMARY KEY,
	`store_id` tinyint unsigned NOT NULL,
	`first_name` varchar(45) NOT NULL,
	`last_name` varchar(45) NOT NULL,
	`email` varchar(50),
	`address_id` smallint unsigned NOT NULL,
	`active` tinyint(1) NOT NULL DEFAULT true,
	`create_date` datetime NOT NULL,
	`last_update` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `film` (
	`film_id` smallint unsigned AUTO_INCREMENT PRIMARY KEY,
	`title` varchar(128) NOT NULL,
	`description` text,
	`release_year` year,
	`language_id` tinyint unsigned NOT NULL,
	`original_language_id` tinyint unsigned,
	`rental_duration` tinyint unsigned NOT NULL DEFAULT 3,
	`rental_rate` decimal(4,2) NOT NULL DEFAULT 4.99,
	`length` smallint unsigned,
	`replacement_cost` decimal(5,2) NOT NULL DEFAULT 19.99,
	`rating` enum('G','PG','PG-13','R','NC-17') DEFAULT 'G',
	`special_features` set('Trailers','Commentaries','Deleted Scenes','Behind the Scenes'),
	`last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `film_actor` (
	`actor_id` smallint unsigned NOT NULL,
	`film_id` smallint unsigned NOT NULL,
	`last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT PRIMARY KEY(`actor_id`,`film_id`)
);
--> statement-breakpoint
CREATE TABLE `film_category` (
	`film_id` smallint unsigned NOT NULL,
	`category_id` tinyint unsigned NOT NULL,
	`last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT PRIMARY KEY(`film_id`,`category_id`)
);
--> statement-breakpoint
CREATE TABLE `film_text` (
	`film_id` smallint unsigned PRIMARY KEY,
	`title` varchar(255) NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`inventory_id` mediumint unsigned AUTO_INCREMENT PRIMARY KEY,
	`film_id` smallint unsigned NOT NULL,
	`store_id` tinyint unsigned NOT NULL,
	`last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `language` (
	`language_id` tinyint unsigned AUTO_INCREMENT PRIMARY KEY,
	`name` char(20) NOT NULL,
	`last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `payment` (
	`payment_id` smallint unsigned AUTO_INCREMENT PRIMARY KEY,
	`customer_id` smallint unsigned NOT NULL,
	`staff_id` tinyint unsigned NOT NULL,
	`rental_id` int,
	`amount` decimal(5,2) NOT NULL,
	`payment_date` datetime NOT NULL,
	`last_update` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `rental` (
	`rental_id` int AUTO_INCREMENT PRIMARY KEY,
	`rental_date` datetime NOT NULL,
	`inventory_id` mediumint unsigned NOT NULL,
	`customer_id` smallint unsigned NOT NULL,
	`return_date` datetime,
	`staff_id` tinyint unsigned NOT NULL,
	`last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rental_date` UNIQUE INDEX(`rental_date`,`inventory_id`,`customer_id`)
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`staff_id` tinyint unsigned AUTO_INCREMENT PRIMARY KEY,
	`first_name` varchar(45) NOT NULL,
	`last_name` varchar(45) NOT NULL,
	`address_id` smallint unsigned NOT NULL,
	`picture` blob,
	`email` varchar(50),
	`store_id` tinyint unsigned NOT NULL,
	`active` tinyint(1) NOT NULL DEFAULT true,
	`username` varchar(16) NOT NULL,
	`password` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
	`last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `store` (
	`store_id` tinyint unsigned AUTO_INCREMENT PRIMARY KEY,
	`manager_staff_id` tinyint unsigned NOT NULL,
	`address_id` smallint unsigned NOT NULL,
	`last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `idx_unique_manager` UNIQUE INDEX(`manager_staff_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_store_id_film_id` ON `inventory` (`store_id`,`film_id`);--> statement-breakpoint
CREATE INDEX `idx_fk_address_id` ON `store` (`address_id`);--> statement-breakpoint
CREATE INDEX `idx_fk_address_id` ON `staff` (`address_id`);--> statement-breakpoint
CREATE INDEX `idx_fk_store_id` ON `staff` (`store_id`);--> statement-breakpoint
CREATE INDEX `idx_fk_staff_id` ON `rental` (`staff_id`);--> statement-breakpoint
CREATE INDEX `idx_fk_customer_id` ON `rental` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_fk_inventory_id` ON `rental` (`inventory_id`);--> statement-breakpoint
CREATE INDEX `idx_fk_customer_id` ON `payment` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_fk_staff_id` ON `payment` (`staff_id`);--> statement-breakpoint
CREATE INDEX `idx_actor_last_name` ON `actor` (`last_name`);--> statement-breakpoint
CREATE INDEX `idx_fk_film_id` ON `inventory` (`film_id`);--> statement-breakpoint
CREATE INDEX `idx_title_description` ON `film_text` (`title`,`description`);--> statement-breakpoint
CREATE INDEX `idx_fk_film_id` ON `film_actor` (`film_id`);--> statement-breakpoint
CREATE INDEX `idx_fk_original_language_id` ON `film` (`original_language_id`);--> statement-breakpoint
CREATE INDEX `idx_fk_language_id` ON `film` (`language_id`);--> statement-breakpoint
CREATE INDEX `idx_title` ON `film` (`title`);--> statement-breakpoint
CREATE INDEX `idx_last_name` ON `customer` (`last_name`);--> statement-breakpoint
CREATE INDEX `idx_fk_address_id` ON `customer` (`address_id`);--> statement-breakpoint
CREATE INDEX `idx_fk_store_id` ON `customer` (`store_id`);--> statement-breakpoint
CREATE INDEX `idx_fk_country_id` ON `city` (`country_id`);--> statement-breakpoint
CREATE INDEX `idx_location` ON `address` (`location`);--> statement-breakpoint
CREATE INDEX `idx_fk_city_id` ON `address` (`city_id`);--> statement-breakpoint
ALTER TABLE `address` ADD CONSTRAINT `fk_address_city` FOREIGN KEY (`city_id`) REFERENCES `city`(`city_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `city` ADD CONSTRAINT `fk_city_country` FOREIGN KEY (`country_id`) REFERENCES `country`(`country_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `customer` ADD CONSTRAINT `fk_customer_address` FOREIGN KEY (`address_id`) REFERENCES `address`(`address_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `customer` ADD CONSTRAINT `fk_customer_store` FOREIGN KEY (`store_id`) REFERENCES `store`(`store_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `film` ADD CONSTRAINT `fk_film_language` FOREIGN KEY (`language_id`) REFERENCES `language`(`language_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `film` ADD CONSTRAINT `fk_film_language_original` FOREIGN KEY (`original_language_id`) REFERENCES `language`(`language_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `film_actor` ADD CONSTRAINT `fk_film_actor_actor` FOREIGN KEY (`actor_id`) REFERENCES `actor`(`actor_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `film_actor` ADD CONSTRAINT `fk_film_actor_film` FOREIGN KEY (`film_id`) REFERENCES `film`(`film_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `film_category` ADD CONSTRAINT `fk_film_category_category` FOREIGN KEY (`category_id`) REFERENCES `category`(`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `film_category` ADD CONSTRAINT `fk_film_category_film` FOREIGN KEY (`film_id`) REFERENCES `film`(`film_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `inventory` ADD CONSTRAINT `fk_inventory_film` FOREIGN KEY (`film_id`) REFERENCES `film`(`film_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `inventory` ADD CONSTRAINT `fk_inventory_store` FOREIGN KEY (`store_id`) REFERENCES `store`(`store_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `fk_payment_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`customer_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `fk_payment_rental` FOREIGN KEY (`rental_id`) REFERENCES `rental`(`rental_id`) ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `fk_payment_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`staff_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `rental` ADD CONSTRAINT `fk_rental_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`customer_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `rental` ADD CONSTRAINT `fk_rental_inventory` FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`inventory_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `rental` ADD CONSTRAINT `fk_rental_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`staff_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `staff` ADD CONSTRAINT `fk_staff_address` FOREIGN KEY (`address_id`) REFERENCES `address`(`address_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `staff` ADD CONSTRAINT `fk_staff_store` FOREIGN KEY (`store_id`) REFERENCES `store`(`store_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `store` ADD CONSTRAINT `fk_store_address` FOREIGN KEY (`address_id`) REFERENCES `address`(`address_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `store` ADD CONSTRAINT `fk_store_staff` FOREIGN KEY (`manager_staff_id`) REFERENCES `staff`(`staff_id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
CREATE ALGORITHM = undefined SQL SECURITY invoker VIEW `actor_info` AS (select `a`.`actor_id` AS `actor_id`,`a`.`first_name` AS `first_name`,`a`.`last_name` AS `last_name`,group_concat(distinct concat(`c`.`name`,': ',(select group_concat(`f`.`title` order by `f`.`title` ASC separator ', ') from ((`sakila`.`film` `f` join `sakila`.`film_category` `fc` on((`f`.`film_id` = `fc`.`film_id`))) join `sakila`.`film_actor` `fa` on((`f`.`film_id` = `fa`.`film_id`))) where ((`fc`.`category_id` = `c`.`category_id`) and (`fa`.`actor_id` = `a`.`actor_id`)))) order by `c`.`name` ASC separator '; ') AS `film_info` from (((`sakila`.`actor` `a` left join `sakila`.`film_actor` `fa` on((`a`.`actor_id` = `fa`.`actor_id`))) left join `sakila`.`film_category` `fc` on((`fa`.`film_id` = `fc`.`film_id`))) left join `sakila`.`category` `c` on((`fc`.`category_id` = `c`.`category_id`))) group by `a`.`actor_id`,`a`.`first_name`,`a`.`last_name`);--> statement-breakpoint
CREATE ALGORITHM = undefined SQL SECURITY definer VIEW `customer_list` AS (select `cu`.`customer_id` AS `ID`,concat(`cu`.`first_name`,' ',`cu`.`last_name`) AS `name`,`a`.`address` AS `address`,`a`.`postal_code` AS `zip code`,`a`.`phone` AS `phone`,`sakila`.`city`.`city` AS `city`,`sakila`.`country`.`country` AS `country`,if(`cu`.`active`,'active','') AS `notes`,`cu`.`store_id` AS `SID` from (((`sakila`.`customer` `cu` join `sakila`.`address` `a` on((`cu`.`address_id` = `a`.`address_id`))) join `sakila`.`city` on((`a`.`city_id` = `sakila`.`city`.`city_id`))) join `sakila`.`country` on((`sakila`.`city`.`country_id` = `sakila`.`country`.`country_id`))));--> statement-breakpoint
CREATE ALGORITHM = undefined SQL SECURITY definer VIEW `film_list` AS (select `sakila`.`film`.`film_id` AS `FID`,`sakila`.`film`.`title` AS `title`,`sakila`.`film`.`description` AS `description`,`sakila`.`category`.`name` AS `category`,`sakila`.`film`.`rental_rate` AS `price`,`sakila`.`film`.`length` AS `length`,`sakila`.`film`.`rating` AS `rating`,group_concat(concat(`sakila`.`actor`.`first_name`,' ',`sakila`.`actor`.`last_name`) separator ', ') AS `actors` from ((((`sakila`.`film` left join `sakila`.`film_category` on((`sakila`.`film_category`.`film_id` = `sakila`.`film`.`film_id`))) left join `sakila`.`category` on((`sakila`.`category`.`category_id` = `sakila`.`film_category`.`category_id`))) left join `sakila`.`film_actor` on((`sakila`.`film`.`film_id` = `sakila`.`film_actor`.`film_id`))) left join `sakila`.`actor` on((`sakila`.`film_actor`.`actor_id` = `sakila`.`actor`.`actor_id`))) group by `sakila`.`film`.`film_id`,`sakila`.`category`.`name`);--> statement-breakpoint
CREATE ALGORITHM = undefined SQL SECURITY definer VIEW `nicer_but_slower_film_list` AS (select `sakila`.`film`.`film_id` AS `FID`,`sakila`.`film`.`title` AS `title`,`sakila`.`film`.`description` AS `description`,`sakila`.`category`.`name` AS `category`,`sakila`.`film`.`rental_rate` AS `price`,`sakila`.`film`.`length` AS `length`,`sakila`.`film`.`rating` AS `rating`,group_concat(concat(concat(upper(substr(`sakila`.`actor`.`first_name`,1,1)),lower(substr(`sakila`.`actor`.`first_name`,2,length(`sakila`.`actor`.`first_name`))),' ',concat(upper(substr(`sakila`.`actor`.`last_name`,1,1)),lower(substr(`sakila`.`actor`.`last_name`,2,length(`sakila`.`actor`.`last_name`)))))) separator ', ') AS `actors` from ((((`sakila`.`film` left join `sakila`.`film_category` on((`sakila`.`film_category`.`film_id` = `sakila`.`film`.`film_id`))) left join `sakila`.`category` on((`sakila`.`category`.`category_id` = `sakila`.`film_category`.`category_id`))) left join `sakila`.`film_actor` on((`sakila`.`film`.`film_id` = `sakila`.`film_actor`.`film_id`))) left join `sakila`.`actor` on((`sakila`.`film_actor`.`actor_id` = `sakila`.`actor`.`actor_id`))) group by `sakila`.`film`.`film_id`,`sakila`.`category`.`name`);--> statement-breakpoint
CREATE ALGORITHM = undefined SQL SECURITY definer VIEW `sales_by_film_category` AS (select `c`.`name` AS `category`,sum(`p`.`amount`) AS `total_sales` from (((((`sakila`.`payment` `p` join `sakila`.`rental` `r` on((`p`.`rental_id` = `r`.`rental_id`))) join `sakila`.`inventory` `i` on((`r`.`inventory_id` = `i`.`inventory_id`))) join `sakila`.`film` `f` on((`i`.`film_id` = `f`.`film_id`))) join `sakila`.`film_category` `fc` on((`f`.`film_id` = `fc`.`film_id`))) join `sakila`.`category` `c` on((`fc`.`category_id` = `c`.`category_id`))) group by `c`.`name` order by `total_sales` desc);--> statement-breakpoint
CREATE ALGORITHM = undefined SQL SECURITY definer VIEW `sales_by_store` AS (select concat(`c`.`city`,',',`cy`.`country`) AS `store`,concat(`m`.`first_name`,' ',`m`.`last_name`) AS `manager`,sum(`p`.`amount`) AS `total_sales` from (((((((`sakila`.`payment` `p` join `sakila`.`rental` `r` on((`p`.`rental_id` = `r`.`rental_id`))) join `sakila`.`inventory` `i` on((`r`.`inventory_id` = `i`.`inventory_id`))) join `sakila`.`store` `s` on((`i`.`store_id` = `s`.`store_id`))) join `sakila`.`address` `a` on((`s`.`address_id` = `a`.`address_id`))) join `sakila`.`city` `c` on((`a`.`city_id` = `c`.`city_id`))) join `sakila`.`country` `cy` on((`c`.`country_id` = `cy`.`country_id`))) join `sakila`.`staff` `m` on((`s`.`manager_staff_id` = `m`.`staff_id`))) group by `s`.`store_id` order by `cy`.`country`,`c`.`city`);--> statement-breakpoint
CREATE ALGORITHM = undefined SQL SECURITY definer VIEW `staff_list` AS (select `s`.`staff_id` AS `ID`,concat(`s`.`first_name`,' ',`s`.`last_name`) AS `name`,`a`.`address` AS `address`,`a`.`postal_code` AS `zip code`,`a`.`phone` AS `phone`,`sakila`.`city`.`city` AS `city`,`sakila`.`country`.`country` AS `country`,`s`.`store_id` AS `SID` from (((`sakila`.`staff` `s` join `sakila`.`address` `a` on((`s`.`address_id` = `a`.`address_id`))) join `sakila`.`city` on((`a`.`city_id` = `sakila`.`city`.`city_id`))) join `sakila`.`country` on((`sakila`.`city`.`country_id` = `sakila`.`country`.`country_id`))));
*/