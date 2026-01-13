// Amadeus API backend proxy
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Proxy endpoint for Amadeus Airport & City Search autocomplete
app.get('/api/autocomplete', async (req, res) => {
  const { keyword } = req.query;
  if (!keyword || keyword.length < 2) {
    return res.json([]);
  }
  try {
    // Get Amadeus access token
    const tokenResponse = await axios.post('https://test.api.amadeus.com/v1/security/oauth2/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.AMADEUS_CLIENT_ID,
        client_secret: process.env.AMADEUS_CLIENT_SECRET
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const access_token = tokenResponse.data.access_token;

    // Call Amadeus Airport & City Search API
    const params = new URLSearchParams({
      keyword,
      subType: 'AIRPORT,CITY',
      'page[limit]': 8
    });
    const amadeusUrl = `https://test.api.amadeus.com/v1/reference-data/locations?${params.toString()}`;
    const response = await axios.get(amadeusUrl, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Amadeus autocomplete', details: err.message });
  }
});

// Proxy endpoint for Amadeus flight search
app.get('/api/flights', async (req, res) => {
  const { origin, destination, depart_date, return_date, cabinClass, adults, children, infants } = req.query;

  try {
    // Step 1: Get Amadeus access token
    const tokenResponse = await axios.post('https://test.api.amadeus.com/v1/security/oauth2/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.AMADEUS_CLIENT_ID,
        client_secret: process.env.AMADEUS_CLIENT_SECRET
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const access_token = tokenResponse.data.access_token;

    // Step 2: Search for flights
    const searchParams = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: depart_date,
      returnDate: return_date,
      travelClass: cabinClass,
      adults,
      children,
      infants,
      currencyCode: 'USD'
    });

    const flightResponse = await axios.get(`https://test.api.amadeus.com/v2/shopping/flight-offers?${searchParams.toString()}`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    res.json(flightResponse.data.data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while fetching flight data', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Amadeus backend running on port ${PORT}`);
});
