// Amadeus API backend proxy
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'd2e27a08557382081d80ed4268fbb552';

app.use(cors());
app.use(express.json());

// Proxy endpoint for Travelpayouts autocomplete
app.get('/api/autocomplete', async (req, res) => {
  const { term } = req.query;
  const url = `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(term)}&locale=en&types[]=city&types[]=airport&token=${API_KEY}`;
  try {
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch autocomplete suggestions', details: err.message });
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
