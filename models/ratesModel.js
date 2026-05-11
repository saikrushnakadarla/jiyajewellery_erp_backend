const db = require('../db'); // Adjust the path to your database connection

const insertRates = (data, callback) => {
    const query = `
        INSERT INTO rates (rate_date, rate_time, rate_16crt, rate_18crt, rate_22crt, rate_24crt, silver_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
        data.rate_date,
        data.rate_time,
        data.rate_16crt,
        data.rate_18crt,
        data.rate_22crt,
        data.rate_24crt,
        data.silver_rate,
    ];
    db.query(query, values, callback);
};

const updateCurrentRates = (data, callback) => {
    const query = `
        UPDATE current_rates
        SET rate_date = ?, rate_time = ?, rate_16crt = ?, rate_18crt = ?, rate_22crt = ?, rate_24crt = ?, silver_rate = ?
        WHERE current_rates_id = 1
    `;
    const values = [
        data.rate_date,
        data.rate_time,
        data.rate_16crt,
        data.rate_18crt,
        data.rate_22crt,
        data.rate_24crt,
        data.silver_rate,
    ];
    db.query(query, values, callback);
};

const insertCurrentRates = (data, callback) => {
    const query = `
        INSERT INTO current_rates (rate_date, rate_time, rate_16crt, rate_18crt, rate_22crt, rate_24crt, silver_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
        data.rate_date,
        data.rate_time,
        data.rate_16crt,
        data.rate_18crt,
        data.rate_22crt,
        data.rate_24crt,
        data.silver_rate,
    ];
    db.query(query, values, callback);
};

const getCurrentRates = (callback) => {
    const query = "SELECT * FROM current_rates WHERE current_rates_id = 1";
    db.query(query, callback);
};

const getRates = (callback) => {
    const query = "SELECT * FROM rates ORDER BY rate_date DESC, rate_time DESC";
    db.query(query, callback);
};

module.exports = {
    insertRates,
    updateCurrentRates,
    insertCurrentRates,
    getCurrentRates,
    getRates
};
