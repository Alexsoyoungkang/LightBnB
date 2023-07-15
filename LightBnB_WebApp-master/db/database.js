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
const getAllProperties = function(options, limit = 10) { //a default value of 10.
  return pool // uses a database connection pool (referred to as pool) to execute a SQL query.
    .query(`SELECT * FROM properties LIMIT $1`, [limit]) //  takes two arguments: the SQL query as a string and an array of values.
    .then((result) => {
      console.log(result.rows); // The rows property of the result object contains an array of rows returned by the query.
      return result.rows; // returns the rows obtained from the query.
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
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
