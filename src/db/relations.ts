import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  address: {
    city: r.one.city({
      from: r.address.cityId,
      to: r.city.cityId,
    }),
    storesViaCustomer: r.many.store({
      from: r.address.addressId.through(r.customer.addressId),
      to: r.store.storeId.through(r.customer.storeId),
      alias: "address_addressId_store_storeId_via_customer",
    }),
    storesViaStaff: r.many.store({
      from: r.address.addressId.through(r.staff.addressId),
      to: r.store.storeId.through(r.staff.storeId),
      alias: "address_addressId_store_storeId_via_staff",
    }),
    staff: r.many.staff({
      from: r.address.addressId.through(r.store.addressId),
      to: r.staff.staffId.through(r.store.managerStaffId),
    }),
  },
  city: {
    addresses: r.many.address(),
    country: r.one.country({
      from: r.city.countryId,
      to: r.country.countryId,
    }),
  },
  country: {
    cities: r.many.city(),
  },
  store: {
    addressesViaCustomer: r.many.address({
      alias: "address_addressId_store_storeId_via_customer",
    }),
    films: r.many.film(),
    addressesViaStaff: r.many.address({
      alias: "address_addressId_store_storeId_via_staff",
    }),
  },
  actor: {
    films: r.many.film({
      from: r.actor.actorId.through(r.filmActor.actorId),
      to: r.film.filmId.through(r.filmActor.filmId),
    }),
  },
  film: {
    actors: r.many.actor(),
    categories: r.many.category(),
    stores: r.many.store({
      from: r.film.filmId.through(r.inventory.filmId),
      to: r.store.storeId.through(r.inventory.storeId),
    }),
  },
  category: {
    films: r.many.film({
      from: r.category.categoryId.through(r.filmCategory.categoryId),
      to: r.film.filmId.through(r.filmCategory.filmId),
    }),
  },
  payment: {
    customer: r.one.customer({
      from: r.payment.customerId,
      to: r.customer.customerId,
    }),
    rental: r.one.rental({
      from: r.payment.rentalId,
      to: r.rental.rentalId,
    }),
    staff: r.one.staff({
      from: r.payment.staffId,
      to: r.staff.staffId,
    }),
  },
  customer: {
    payments: r.many.payment(),
    rentals: r.many.rental(),
  },
  rental: {
    payments: r.many.payment(),
    customer: r.one.customer({
      from: r.rental.customerId,
      to: r.customer.customerId,
    }),
    inventory: r.one.inventory({
      from: r.rental.inventoryId,
      to: r.inventory.inventoryId,
    }),
    staff: r.one.staff({
      from: r.rental.staffId,
      to: r.staff.staffId,
    }),
  },
  staff: {
    payments: r.many.payment(),
    rentals: r.many.rental(),
    addresses: r.many.address(),
  },
  inventory: {
    rentals: r.many.rental(),
  },
}));
