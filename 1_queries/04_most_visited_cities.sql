SELECT city AS city, COUNT(reservations) AS total_reservation
FROM properties
JOIN reservations ON property_id = properties.id
GROUP BY properties.city
ORDER BY COUNT(reservations) DESC;