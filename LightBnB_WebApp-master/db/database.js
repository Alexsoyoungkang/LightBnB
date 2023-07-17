const properties = require("./json/properties.json");
const users = require("./json/users.json");
// Connection
const { Pool } = require('pg');

//Connect to database
const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`SELECT * FROM users WHERE email = $1`, [email])
    .then((result) => {
      if (!result.rows.length) {
        return null; // If that user email does not exist return null.
      }
      console.log('result',result.rows[0]);
      return result.rows[0]; // The promise should resolve with a user object - extracts the object from the array
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`SELECT * FROM users WHERE id = $1;`, [id])
    .then((result) => {
      if (!result.rows.length) {
        return null; // If that user id does not exist return null.
      }
      console.log(result.rows[0]);
      return result.rows[0]; // // The promise should resolve with a user object - extracts the object from the array
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  const queryString = `
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;
    `;

  return pool
    .query(queryString, [user.name, user.email, user.password]) // Accepts a user object that will have a name, email, and password property
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const queryString = `
  SELECT reservations.*, properties.*, AVG(property_reviews.rating) AS average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;
  `;
  /// write a query that returns all reservations when given a specific user id
  /// this query should return all the rows associated with that user id
  return pool
    .query(queryString, [guest_id, limit])
    .then((result) => {
      console.log(result);
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  // 1. an array to hold any parameters that may be available for the query
  const queryParams = [];
  // 2. the query with all information that comes before the WHERE clause.
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  WHERE true 
  `; // Where true -the initial condition provides a consistent starting point for appending the filter conditions.
  
  // Checks each filter option and add the corresponding conditions to the queryString and parameters to the queryParams array.
  if (options.city) { // If the option.city filter is provided and it has a value
    queryParams.push(`%${options.city}%`); // pushes the parameter value for the options.city filter into the queryParams array.
    queryString += `AND city ILIKE $${queryParams.length} `; // appends the condition to the queryString(AND city ILIKE $n) and ILIKE is for case-insensitive pattern match
  } // $${queryParams.length} = $n represents the position of the parameter in the queryParams array.

  if (options.owner_id) {
    queryParams.push(`${options.owner_id}`);
    queryString += `AND owner_id = $${queryParams.length} `;
  }

  if (options.minimum_price_per_night && options.maximum_price_per_night) { // Checks if both a minimum_price_per_night and a maximum_price_per_night are provided
    queryParams.push(`${Number(options.minimum_price_per_night)}` * 100); // The database stores amounts in cents
    queryString += `AND cost_per_night >= $${queryParams.length}`; // placeholder for the min price
    queryParams.push(`${Number(options.maximum_price_per_night)}` * 100);
    queryString += `AND cost_per_night <= $${queryParams.length}`;
  }
  // 4. appends the GROUP BY clause to the queryString, grouping by the property's ID.
  queryString += `
  GROUP BY properties.id
  `;

  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`);
    queryString += `HAVING AVG(rating) >= $${queryParams.length}`; // The actual value(rating) users put
  }

  queryParams.push(limit); // Pushes the limit value into the queryParams array
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `; // appends the ORDER BY and LIMIT clauses to the queryString

  // 5. logs queryString and queryParams for debugging purposes
  console.log(queryString, queryParams);

  // 6. Return the resulting rows from the query
  return pool
    .query(queryString, queryParams)
    .then((result) => {
      console.log(result);
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const queryString = `
  INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING *;
  `;

  const queryParams = [
    property.owner_id, property.title, property.description, property.thumbnail_photo_url,
    property.cover_photo_url, property.cost_per_night, property.street, property.city,
    property.province, property.post_code, property.country, property.parking_spaces,
    property.number_of_bathrooms, property.number_of_bedrooms
  ];

  return pool
    .query(queryString, queryParams)
    .then((result) => {
      console.log(result.rows[0]);
      return result.rows[0]; // / Returns the new property's details
    })
    .catch((err) => {
      console.log(err.message);
    });
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
