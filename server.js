'use strict';

const express = require('express');
const pg = require('pg');
const superagent = require('superagent');
const cors = require('cors');
const override = require('method-override');
require('dotenv').config();

const app = express();
// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const PORT = process.env.PORT;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));
app.use(override('_method'));
app.set('view engine', 'ejs');

// handlers functions
const handleHome = (req, res) => {
  const url = 'https://api.covid19api.com/world/total';
  superagent.get(url).then((data) => {
    res.render('index', { covid: data.body });
  });
};

const handleCountry = (req, res) => {
  const country = req.body.country;
  const url = `https://api.covid19api.com/country/${country}/status/confirmed`;
  const query = {
    from: req.body.from,
    to: req.body.to,
  };
  superagent
    .get(url)
    .query(query)
    .then((data) => {
      res.render('search/show', { covid: data.body });
    });
};

const handleAll = (req, res) => {
  const url = 'https://api.covid19api.com/summary';
  superagent.get(url).then((data) => {
    let countArray = data.body.Countries.map((value) => new Country(value));
    res.render('all', { covid: countArray });
  });
};

const handleAdd = (req, res) => {
  const query =
    'INSERT INTO covid(country, confirmed, deaths, recovered, date) VALUES($1,$2,$3,$4,$5);';
  const secuerValues = Object.values(req.body); // array of [country_name, confiremed_cases, ...]
  client.query(query, secuerValues).then(() => {
    res.redirect('/myRecords');
  });
};

const handleRecords = (req, res) => {
  const query = 'SELECT * FROM covid;';
  client.query(query).then((data) => {
    res.render('myRecords', { covid: data.rows });
  });
};

const handleDetail = (req, res) => {
  const id = req.params.id;
  const query = 'SELECT * FROM covid WHERE id=$1';
  const secureId = [id];
  client.query(query, secureId).then((data) => {
    res.render('search/detail', { covid: data.rows[0] });
  });
};

const handleDelete = (req, res) => {
  const id = req.params.id;
  const query = 'DELETE FROM covid WHERE id=$1';
  const secureId = [id];
  client.query(query, secureId).then(() => {
    res.redirect('/myRecords');
  });
};

// routes
app.get('/', handleHome);
app.get('/allCountries', handleAll);
app.get('/myRecords', handleRecords);
app.post('/country', handleCountry);
app.post('/add', handleAdd);
app.post('/detail/:id', handleDetail);
app.delete('/detail/:id', handleDelete);
// counstructors

function Country(country) {
  this.country = country.Country;
  this.confirmed = country.TotalConfirmed;
  this.deaths = country.TotalDeaths;
  this.recovered = country.TotalRecovered;
  this.date = country.Date;
}

client
  .connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log('App is listening on PORT', PORT);
    });
  })
  .catch((error) => {
    console.log('Error in connecting to DATABASE', error);
  });
