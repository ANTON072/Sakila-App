import { sql } from "drizzle-orm";
import {
  type AnyMySqlColumn,
  blob,
  boolean,
  char,
  customType,
  datetime,
  decimal,
  index,
  int,
  mediumint,
  mysqlEnum,
  mysqlTable,
  mysqlView,
  primaryKey,
  smallint,
  text,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
  year,
} from "drizzle-orm/mysql-core";

export const actor = mysqlTable(
  "actor",
  {
    actorId: smallint("actor_id", { unsigned: true })
      .autoincrement()
      .primaryKey(),
    firstName: varchar("first_name", { length: 45 }).notNull(),
    lastName: varchar("last_name", { length: 45 }).notNull(),
    lastUpdate: timestamp("last_update").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("idx_actor_last_name").on(table.lastName)],
);

export const address = mysqlTable(
  "address",
  {
    addressId: smallint("address_id", { unsigned: true })
      .autoincrement()
      .primaryKey(),
    address: varchar({ length: 50 }).notNull(),
    address2: varchar({ length: 50 }),
    district: varchar({ length: 20 }).notNull(),
    cityId: smallint("city_id", { unsigned: true })
      .notNull()
      .references(() => city.cityId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    postalCode: varchar("postal_code", { length: 10 }),
    phone: varchar({ length: 20 }).notNull(),
    location: customType({ dataType: () => "geometry" })().notNull(),
    lastUpdate: timestamp("last_update").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_location").on(table.location),
    index("idx_fk_city_id").on(table.cityId),
  ],
);

export const category = mysqlTable("category", {
  categoryId: tinyint("category_id", { unsigned: true })
    .autoincrement()
    .primaryKey(),
  name: varchar({ length: 25 }).notNull(),
  lastUpdate: timestamp("last_update").defaultNow().onUpdateNow().notNull(),
});

export const city = mysqlTable(
  "city",
  {
    cityId: smallint("city_id", { unsigned: true })
      .autoincrement()
      .primaryKey(),
    city: varchar({ length: 50 }).notNull(),
    countryId: smallint("country_id", { unsigned: true })
      .notNull()
      .references(() => country.countryId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    lastUpdate: timestamp("last_update").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("idx_fk_country_id").on(table.countryId)],
);

export const country = mysqlTable("country", {
  countryId: smallint("country_id", { unsigned: true })
    .autoincrement()
    .primaryKey(),
  country: varchar({ length: 50 }).notNull(),
  lastUpdate: timestamp("last_update").defaultNow().onUpdateNow().notNull(),
});

export const customer = mysqlTable(
  "customer",
  {
    customerId: smallint("customer_id", { unsigned: true })
      .autoincrement()
      .primaryKey(),
    storeId: tinyint("store_id", { unsigned: true })
      .notNull()
      .references(() => store.storeId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    firstName: varchar("first_name", { length: 45 }).notNull(),
    lastName: varchar("last_name", { length: 45 }).notNull(),
    email: varchar({ length: 50 }),
    addressId: smallint("address_id", { unsigned: true })
      .notNull()
      .references(() => address.addressId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    active: boolean().default(true).notNull(),
    createDate: datetime("create_date").notNull(),
    lastUpdate: timestamp("last_update").defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_last_name").on(table.lastName),
    index("idx_fk_address_id").on(table.addressId),
    index("idx_fk_store_id").on(table.storeId),
  ],
);

export const film = mysqlTable(
  "film",
  {
    filmId: smallint("film_id", { unsigned: true })
      .autoincrement()
      .primaryKey(),
    title: varchar({ length: 128 }).notNull(),
    description: text(),
    releaseYear: year("release_year"),
    languageId: tinyint("language_id", { unsigned: true })
      .notNull()
      .references(() => language.languageId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    originalLanguageId: tinyint("original_language_id", {
      unsigned: true,
    }).references(() => language.languageId, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
    rentalDuration: tinyint("rental_duration", { unsigned: true })
      .default(3)
      .notNull(),
    rentalRate: decimal("rental_rate", {
      precision: 4,
      scale: 2,
      mode: "number",
    })
      .default(4.99)
      .notNull(),
    length: smallint({ unsigned: true }),
    replacementCost: decimal("replacement_cost", {
      precision: 5,
      scale: 2,
      mode: "number",
    })
      .default(19.99)
      .notNull(),
    rating: mysqlEnum(["G", "PG", "PG-13", "R", "NC-17"]).default("G"),
    specialFeatures: customType({
      dataType: () =>
        `set('trailers','commentaries','deleted scenes','behind the scenes')`,
    })("special_features"),
    lastUpdate: timestamp("last_update").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_fk_original_language_id").on(table.originalLanguageId),
    index("idx_fk_language_id").on(table.languageId),
    index("idx_title").on(table.title),
  ],
);

export const filmActor = mysqlTable(
  "film_actor",
  {
    actorId: smallint("actor_id", { unsigned: true })
      .notNull()
      .references(() => actor.actorId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    filmId: smallint("film_id", { unsigned: true })
      .notNull()
      .references(() => film.filmId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    lastUpdate: timestamp("last_update").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.actorId, table.filmId] }),
    index("idx_fk_film_id").on(table.filmId),
  ],
);

export const filmCategory = mysqlTable(
  "film_category",
  {
    filmId: smallint("film_id", { unsigned: true })
      .notNull()
      .references(() => film.filmId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    categoryId: tinyint("category_id", { unsigned: true })
      .notNull()
      .references(() => category.categoryId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    lastUpdate: timestamp("last_update").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.filmId, table.categoryId] })],
);

export const filmText = mysqlTable(
  "film_text",
  {
    filmId: smallint("film_id", { unsigned: true }).primaryKey(),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
  },
  (table) => [
    index("idx_title_description").on(table.title, table.description),
  ],
);

export const inventory = mysqlTable(
  "inventory",
  {
    inventoryId: mediumint("inventory_id", { unsigned: true })
      .autoincrement()
      .primaryKey(),
    filmId: smallint("film_id", { unsigned: true })
      .notNull()
      .references(() => film.filmId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    storeId: tinyint("store_id", { unsigned: true })
      .notNull()
      .references(() => store.storeId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    lastUpdate: timestamp("last_update").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_store_id_film_id").on(table.storeId, table.filmId),
    index("idx_fk_film_id").on(table.filmId),
  ],
);

export const language = mysqlTable("language", {
  languageId: tinyint("language_id", { unsigned: true })
    .autoincrement()
    .primaryKey(),
  name: char({ length: 20 }).notNull(),
  lastUpdate: timestamp("last_update").defaultNow().onUpdateNow().notNull(),
});

export const payment = mysqlTable(
  "payment",
  {
    paymentId: smallint("payment_id", { unsigned: true })
      .autoincrement()
      .primaryKey(),
    customerId: smallint("customer_id", { unsigned: true })
      .notNull()
      .references(() => customer.customerId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    staffId: tinyint("staff_id", { unsigned: true })
      .notNull()
      .references(() => staff.staffId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    rentalId: int("rental_id").references(() => rental.rentalId, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    amount: decimal({ precision: 5, scale: 2 }).notNull(),
    paymentDate: datetime("payment_date").notNull(),
    lastUpdate: timestamp("last_update").defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_fk_customer_id").on(table.customerId),
    index("idx_fk_staff_id").on(table.staffId),
  ],
);

export const rental = mysqlTable(
  "rental",
  {
    rentalId: int("rental_id").autoincrement().primaryKey(),
    rentalDate: datetime("rental_date").notNull(),
    inventoryId: mediumint("inventory_id", { unsigned: true })
      .notNull()
      .references(() => inventory.inventoryId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    customerId: smallint("customer_id", { unsigned: true })
      .notNull()
      .references(() => customer.customerId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    returnDate: datetime("return_date"),
    staffId: tinyint("staff_id", { unsigned: true })
      .notNull()
      .references(() => staff.staffId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    lastUpdate: timestamp("last_update").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_fk_staff_id").on(table.staffId),
    index("idx_fk_customer_id").on(table.customerId),
    index("idx_fk_inventory_id").on(table.inventoryId),
    uniqueIndex("rental_date").on(
      table.rentalDate,
      table.inventoryId,
      table.customerId,
    ),
  ],
);

export const staff = mysqlTable(
  "staff",
  {
    staffId: tinyint("staff_id", { unsigned: true })
      .autoincrement()
      .primaryKey(),
    firstName: varchar("first_name", { length: 45 }).notNull(),
    lastName: varchar("last_name", { length: 45 }).notNull(),
    addressId: smallint("address_id", { unsigned: true })
      .notNull()
      .references(() => address.addressId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    picture: blob(),
    email: varchar({ length: 50 }),
    storeId: tinyint("store_id", { unsigned: true })
      .notNull()
      .references((): AnyMySqlColumn => store.storeId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    active: boolean().default(true).notNull(),
    username: varchar({ length: 16 }).notNull(),
    password: varchar({ length: 255 }).charSet("utf8mb4").collate("utf8mb4_bin"),
    lastUpdate: timestamp("last_update").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_fk_address_id").on(table.addressId),
    index("idx_fk_store_id").on(table.storeId),
  ],
);

export const store = mysqlTable(
  "store",
  {
    storeId: tinyint("store_id", { unsigned: true })
      .autoincrement()
      .primaryKey(),
    managerStaffId: tinyint("manager_staff_id", { unsigned: true })
      .notNull()
      .references((): AnyMySqlColumn => staff.staffId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    addressId: smallint("address_id", { unsigned: true })
      .notNull()
      .references(() => address.addressId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    lastUpdate: timestamp("last_update").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_fk_address_id").on(table.addressId),
    uniqueIndex("idx_unique_manager").on(table.managerStaffId),
  ],
);
export const actorInfo = mysqlView("actor_info", {
  actorId: smallint("actor_id", { unsigned: true }).notNull(),

  firstName: varchar("first_name", { length: 45 }).notNull(),

  lastName: varchar("last_name", { length: 45 }).notNull(),

  filmInfo: text("film_info"),
})
  .algorithm("undefined")
  .sqlSecurity("invoker")
  .as(
    sql`select \`a\`.\`actor_id\` AS \`actor_id\`,\`a\`.\`first_name\` AS \`first_name\`,\`a\`.\`last_name\` AS \`last_name\`,group_concat(distinct concat(\`c\`.\`name\`,': ',(select group_concat(\`f\`.\`title\` order by \`f\`.\`title\` ASC separator ', ') from ((\`sakila\`.\`film\` \`f\` join \`sakila\`.\`film_category\` \`fc\` on((\`f\`.\`film_id\` = \`fc\`.\`film_id\`))) join \`sakila\`.\`film_actor\` \`fa\` on((\`f\`.\`film_id\` = \`fa\`.\`film_id\`))) where ((\`fc\`.\`category_id\` = \`c\`.\`category_id\`) and (\`fa\`.\`actor_id\` = \`a\`.\`actor_id\`)))) order by \`c\`.\`name\` ASC separator '; ') AS \`film_info\` from (((\`sakila\`.\`actor\` \`a\` left join \`sakila\`.\`film_actor\` \`fa\` on((\`a\`.\`actor_id\` = \`fa\`.\`actor_id\`))) left join \`sakila\`.\`film_category\` \`fc\` on((\`fa\`.\`film_id\` = \`fc\`.\`film_id\`))) left join \`sakila\`.\`category\` \`c\` on((\`fc\`.\`category_id\` = \`c\`.\`category_id\`))) group by \`a\`.\`actor_id\`,\`a\`.\`first_name\`,\`a\`.\`last_name\``,
  );

export const customerList = mysqlView("customer_list", {
  id: smallint("ID", { unsigned: true }).notNull(),

  name: varchar({ length: 91 }),

  address: varchar({ length: 50 }).notNull(),

  zipCode: varchar("zip code", { length: 10 }),

  phone: varchar({ length: 20 }).notNull(),

  city: varchar({ length: 50 }).notNull(),

  country: varchar({ length: 50 }).notNull(),

  notes: varchar({ length: 6 }).notNull(),

  sid: tinyint("SID", { unsigned: true }).notNull(),
})
  .algorithm("undefined")
  .sqlSecurity("definer")
  .as(
    sql`select \`cu\`.\`customer_id\` AS \`ID\`,concat(\`cu\`.\`first_name\`,' ',\`cu\`.\`last_name\`) AS \`name\`,\`a\`.\`address\` AS \`address\`,\`a\`.\`postal_code\` AS \`zip code\`,\`a\`.\`phone\` AS \`phone\`,\`sakila\`.\`city\`.\`city\` AS \`city\`,\`sakila\`.\`country\`.\`country\` AS \`country\`,if(\`cu\`.\`active\`,'active','') AS \`notes\`,\`cu\`.\`store_id\` AS \`SID\` from (((\`sakila\`.\`customer\` \`cu\` join \`sakila\`.\`address\` \`a\` on((\`cu\`.\`address_id\` = \`a\`.\`address_id\`))) join \`sakila\`.\`city\` on((\`a\`.\`city_id\` = \`sakila\`.\`city\`.\`city_id\`))) join \`sakila\`.\`country\` on((\`sakila\`.\`city\`.\`country_id\` = \`sakila\`.\`country\`.\`country_id\`)))`,
  );

export const filmList = mysqlView("film_list", {
  fid: smallint("FID", { unsigned: true }).notNull(),

  title: varchar({ length: 128 }).notNull(),

  description: text(),

  category: varchar({ length: 25 }),

  price: decimal({ precision: 4, scale: 2 }).notNull(),

  length: smallint({ unsigned: true }),

  rating: mysqlEnum(["G", "PG", "PG-13", "R", "NC-17"]),

  actors: text(),
})
  .algorithm("undefined")
  .sqlSecurity("definer")
  .as(
    sql`select \`sakila\`.\`film\`.\`film_id\` AS \`FID\`,\`sakila\`.\`film\`.\`title\` AS \`title\`,\`sakila\`.\`film\`.\`description\` AS \`description\`,\`sakila\`.\`category\`.\`name\` AS \`category\`,\`sakila\`.\`film\`.\`rental_rate\` AS \`price\`,\`sakila\`.\`film\`.\`length\` AS \`length\`,\`sakila\`.\`film\`.\`rating\` AS \`rating\`,group_concat(concat(\`sakila\`.\`actor\`.\`first_name\`,' ',\`sakila\`.\`actor\`.\`last_name\`) separator ', ') AS \`actors\` from ((((\`sakila\`.\`film\` left join \`sakila\`.\`film_category\` on((\`sakila\`.\`film_category\`.\`film_id\` = \`sakila\`.\`film\`.\`film_id\`))) left join \`sakila\`.\`category\` on((\`sakila\`.\`category\`.\`category_id\` = \`sakila\`.\`film_category\`.\`category_id\`))) left join \`sakila\`.\`film_actor\` on((\`sakila\`.\`film\`.\`film_id\` = \`sakila\`.\`film_actor\`.\`film_id\`))) left join \`sakila\`.\`actor\` on((\`sakila\`.\`film_actor\`.\`actor_id\` = \`sakila\`.\`actor\`.\`actor_id\`))) group by \`sakila\`.\`film\`.\`film_id\`,\`sakila\`.\`category\`.\`name\``,
  );

export const nicerButSlowerFilmList = mysqlView("nicer_but_slower_film_list", {
  fid: smallint("FID", { unsigned: true }).notNull(),

  title: varchar({ length: 128 }).notNull(),

  description: text(),

  category: varchar({ length: 25 }),

  price: decimal({ precision: 4, scale: 2 }).notNull(),

  length: smallint({ unsigned: true }),

  rating: mysqlEnum(["G", "PG", "PG-13", "R", "NC-17"]),

  actors: text(),
})
  .algorithm("undefined")
  .sqlSecurity("definer")
  .as(
    sql`select \`sakila\`.\`film\`.\`film_id\` AS \`FID\`,\`sakila\`.\`film\`.\`title\` AS \`title\`,\`sakila\`.\`film\`.\`description\` AS \`description\`,\`sakila\`.\`category\`.\`name\` AS \`category\`,\`sakila\`.\`film\`.\`rental_rate\` AS \`price\`,\`sakila\`.\`film\`.\`length\` AS \`length\`,\`sakila\`.\`film\`.\`rating\` AS \`rating\`,group_concat(concat(concat(upper(substr(\`sakila\`.\`actor\`.\`first_name\`,1,1)),lower(substr(\`sakila\`.\`actor\`.\`first_name\`,2,length(\`sakila\`.\`actor\`.\`first_name\`))),' ',concat(upper(substr(\`sakila\`.\`actor\`.\`last_name\`,1,1)),lower(substr(\`sakila\`.\`actor\`.\`last_name\`,2,length(\`sakila\`.\`actor\`.\`last_name\`)))))) separator ', ') AS \`actors\` from ((((\`sakila\`.\`film\` left join \`sakila\`.\`film_category\` on((\`sakila\`.\`film_category\`.\`film_id\` = \`sakila\`.\`film\`.\`film_id\`))) left join \`sakila\`.\`category\` on((\`sakila\`.\`category\`.\`category_id\` = \`sakila\`.\`film_category\`.\`category_id\`))) left join \`sakila\`.\`film_actor\` on((\`sakila\`.\`film\`.\`film_id\` = \`sakila\`.\`film_actor\`.\`film_id\`))) left join \`sakila\`.\`actor\` on((\`sakila\`.\`film_actor\`.\`actor_id\` = \`sakila\`.\`actor\`.\`actor_id\`))) group by \`sakila\`.\`film\`.\`film_id\`,\`sakila\`.\`category\`.\`name\``,
  );

export const salesByFilmCategory = mysqlView("sales_by_film_category", {
  category: varchar({ length: 25 }).notNull(),

  totalSales: decimal("total_sales", { precision: 27, scale: 2 }),
})
  .algorithm("undefined")
  .sqlSecurity("definer")
  .as(
    sql`select \`c\`.\`name\` AS \`category\`,sum(\`p\`.\`amount\`) AS \`total_sales\` from (((((\`sakila\`.\`payment\` \`p\` join \`sakila\`.\`rental\` \`r\` on((\`p\`.\`rental_id\` = \`r\`.\`rental_id\`))) join \`sakila\`.\`inventory\` \`i\` on((\`r\`.\`inventory_id\` = \`i\`.\`inventory_id\`))) join \`sakila\`.\`film\` \`f\` on((\`i\`.\`film_id\` = \`f\`.\`film_id\`))) join \`sakila\`.\`film_category\` \`fc\` on((\`f\`.\`film_id\` = \`fc\`.\`film_id\`))) join \`sakila\`.\`category\` \`c\` on((\`fc\`.\`category_id\` = \`c\`.\`category_id\`))) group by \`c\`.\`name\` order by \`total_sales\` desc`,
  );

export const salesByStore = mysqlView("sales_by_store", {
  store: varchar({ length: 101 }),

  manager: varchar({ length: 91 }),

  totalSales: decimal("total_sales", { precision: 27, scale: 2 }),
})
  .algorithm("undefined")
  .sqlSecurity("definer")
  .as(
    sql`select concat(\`c\`.\`city\`,',',\`cy\`.\`country\`) AS \`store\`,concat(\`m\`.\`first_name\`,' ',\`m\`.\`last_name\`) AS \`manager\`,sum(\`p\`.\`amount\`) AS \`total_sales\` from (((((((\`sakila\`.\`payment\` \`p\` join \`sakila\`.\`rental\` \`r\` on((\`p\`.\`rental_id\` = \`r\`.\`rental_id\`))) join \`sakila\`.\`inventory\` \`i\` on((\`r\`.\`inventory_id\` = \`i\`.\`inventory_id\`))) join \`sakila\`.\`store\` \`s\` on((\`i\`.\`store_id\` = \`s\`.\`store_id\`))) join \`sakila\`.\`address\` \`a\` on((\`s\`.\`address_id\` = \`a\`.\`address_id\`))) join \`sakila\`.\`city\` \`c\` on((\`a\`.\`city_id\` = \`c\`.\`city_id\`))) join \`sakila\`.\`country\` \`cy\` on((\`c\`.\`country_id\` = \`cy\`.\`country_id\`))) join \`sakila\`.\`staff\` \`m\` on((\`s\`.\`manager_staff_id\` = \`m\`.\`staff_id\`))) group by \`s\`.\`store_id\` order by \`cy\`.\`country\`,\`c\`.\`city\``,
  );

export const staffList = mysqlView("staff_list", {
  id: tinyint("ID", { unsigned: true }).notNull(),

  name: varchar({ length: 91 }),

  address: varchar({ length: 50 }).notNull(),

  zipCode: varchar("zip code", { length: 10 }),

  phone: varchar({ length: 20 }).notNull(),

  city: varchar({ length: 50 }).notNull(),

  country: varchar({ length: 50 }).notNull(),

  sid: tinyint("SID", { unsigned: true }).notNull(),
})
  .algorithm("undefined")
  .sqlSecurity("definer")
  .as(
    sql`select \`s\`.\`staff_id\` AS \`ID\`,concat(\`s\`.\`first_name\`,' ',\`s\`.\`last_name\`) AS \`name\`,\`a\`.\`address\` AS \`address\`,\`a\`.\`postal_code\` AS \`zip code\`,\`a\`.\`phone\` AS \`phone\`,\`sakila\`.\`city\`.\`city\` AS \`city\`,\`sakila\`.\`country\`.\`country\` AS \`country\`,\`s\`.\`store_id\` AS \`SID\` from (((\`sakila\`.\`staff\` \`s\` join \`sakila\`.\`address\` \`a\` on((\`s\`.\`address_id\` = \`a\`.\`address_id\`))) join \`sakila\`.\`city\` on((\`a\`.\`city_id\` = \`sakila\`.\`city\`.\`city_id\`))) join \`sakila\`.\`country\` on((\`sakila\`.\`city\`.\`country_id\` = \`sakila\`.\`country\`.\`country_id\`)))`,
  );
