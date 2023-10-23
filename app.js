const axios = require("axios");
const express = require("express");
const cors = require('cors');

const PORT = 4000;

const app = express();
app.use(cors()); 

app.get("/", (req, res) => {
	res.status(200).json("Welcome, your app is working well");
});

app.get("/decksFound/:id", async (req, res) => {
	const card = req.params.id;
	const { data } = await axios.get(
		`https://ygoprodeck.com/api/card/decksFound.php?cardnumber=${card}`
	);
	let main = [];
	let extra = [];
	let side = [];
	for (const deck of data) {
		const resp = await axios.get(
			`https://ygoprodeck.com/deck/${deck.pretty_url}`
		);
		resp.data.split("\n").forEach((_) => {
			if (_.includes("var maindeckjs = '")) {
				main = [
					...main,
					...JSON.parse(
						_.split("var maindeckjs = '")[1].replace("';", "")
					),
				];
			}
			if (_.includes("var extradeckjs = '")) {
				extra = [
					...extra,
					...JSON.parse(
						_.split("var extradeckjs = '")[1].replace("';", "")
					),
				];
			}
			if (_.includes("var sidedeckjs = '")) {
				side = [
					...side,
					...JSON.parse(
						_.split("var sidedeckjs = '")[1].replace("';", "")
					),
				];
			}
		});
	}
	let ydk = "#created by Ale\n#main\n";
	main.forEach((_) => (ydk += _ + "\n"));

	ydk += "#extra\n";
	extra.forEach((_) => (ydk += _ + "\n"));

	ydk += "!side\n";
	side.forEach((_) => (ydk += _ + "\n"));

	return res.json({
		main,
		extra,
		side,
		ydk
	});
});

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});

// Export the Express API
module.exports = app;
