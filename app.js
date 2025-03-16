const axios = require("axios");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
require("dotenv").config();

const serviceAccount = JSON.parse(process.env.privateKey);

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});
const PORT = 4000;

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

app.get("/", (req, res) => {
	res.status(200).json("Welcome, your app is working well");
});

app.get("/decksFound/:id", async (req, res) => {
	const card = req.params.id;
	try {
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
			ydk,
		});
	} catch (e) {
		return res.json({
			main: [],
			extra: [],
			side: [],
			ydk: "",
		});
	}
});

app.get("/decksFoundOne/:id", async (req, res) => {
	const card = req.params.id;
	try {
		let { data } = await axios.get(
			`https://ygoprodeck.com/api/card/decksFound.php?cardnumber=${card}`
		);
		data = data.filter((deck) => {
			return (
				[
					"Common Charity Decks",
					"Fun/Casual Decks",
					"Non-Meta Decks",
					"Theorycrafting Decks",
					"Meta Decks",
					"Tournament Meta Decks",
				].includes(deck.format) &&
				!(
					deck.deck_name.toLowerCase().includes("draft") ||
					deck.deck_name.toLowerCase().includes("prog") ||
					deck.deck_name.toLowerCase().includes("edison") ||
					deck.deck_name.toLowerCase().includes("masochist")
				)
			);
		});
		if (data.length === 0)
			return res.json({
				main: [],
				extra: [],
				side: [],
				ydk: "",
				deck_name: "",
				url: "",
			});

		const decks = data.sort(() => Math.random() - 0.5);
		let i = 0;
		for (const deck of decks) {
			let main = [];
			let extra = [];
			let side = [];

			const url = `https://ygoprodeck.com/deck/${deck.pretty_url}`;
			const resp = await axios.get(url);
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

			// Check if highlander
			const filtered = [
				...main,
				// ...suggestions.side,
				...extra,
			];
			const counts = {};
			for (const cardId of filtered) {
				counts[cardId] = counts[cardId] ? counts[cardId] + 1 : 1;
			}
			if (Math.max(...Object.entries(counts).map((_) => _[1])) !== 3) {
				console.log("Highlander: " + url);
				continue;
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
				ydk,
				deck_name: deck.deck_name,
				url,
			});
		}
		return res.json({
			main: [],
			extra: [],
			side: [],
			ydk: "",
			deck_name: "",
			url: "",
		});
	} catch (e) {
		return res.json({
			main: [],
			extra: [],
			side: [],
			ydk: "",
			deck_name: "",
			url: "",
		});
	}
});

app.get("/get_decks", async (req, res) => {
	const decksRef = admin.firestore().collection("decks_random");
	const snapshot = await decksRef.get();
	const ris = [];
	snapshot.forEach((doc) => ris.push(doc.data()));
	return res.send(ris);
});

app.post("/update_deck", async (req, res) => {
	const { deckName, ydk } = req.body;
	let d = new Date();
	// Convert the local time to UTC
	d = new Date(
		d.getUTCFullYear(),
		d.getUTCMonth(),
		d.getUTCDate(),
		d.getUTCHours(),
		d.getUTCMinutes(),
		d.getUTCSeconds()
	);
	const deck = {
		ydk,
		deckName,
		date: d.toLocaleString("se-SE"),
	};
	const docRef = admin.firestore().collection("decks_random").doc(deckName);
	docRef
		.get()
		.then((doc) => {
			if (doc.exists) {
				// Document exists, update it
				return docRef.update({
					ydk: ydk,
					date: d.toLocaleString("se-SE"),
				});
			} else {
				// Document does not exist, create it
				return docRef.set(deck);
			}
		})
		.catch((error) => {
			console.log("Error deck updating:", error);
		});
	return res.send("Success deck updating");
});

app.post("/delete_deck", async (req, res) => {
	const { deckName } = req.body;
	const docRef = admin.firestore().collection("decks_random").doc(deckName);
	docRef
		.get()
		.then((doc) => {
			if (doc.exists) {
				// Document exists, update it
				return docRef.delete();
			}
		})
		.catch((error) => {
			console.log("Error deck deleting:", error);
		});
	return res.send("Success deck deleting");
});

// ---------------------------------------------------------------------

app.get("/get_availabilities", async (req, res) => {
	const availabilitiesRef = admin.firestore().collection("availabilities");
	const snapshot = await availabilitiesRef.get();
	const ris = [];
	snapshot.forEach((doc) => ris.push(doc.data()));
	console.log(ris)
	return res.send(ris);
});

app.post("/update_availabilities", async (req, res) => {
	console.log(req.body)

	const { duelist, availabilities } = req.body;

	const obj = {
		duelist,
		availabilities
	};

	const docRef = admin.firestore().collection("availabilities").doc(duelist);
	docRef
		.get()
		.then((doc) => {
			if (doc.exists) {
				// Document exists, update it
				return docRef.update({
					availabilities: availabilities,
				});
			} else {
				// Document does not exist, create it
				return docRef.set(obj);
			}
		})
		.catch((error) => {
			console.log("Error availabilities updating:", error);
		});
	return res.send("Success availabilities updating");
});

// ---------------------------------------------------------------------

async function getAllProposals() {
	const proposalsRef = admin.firestore().collection("proposals");
	const snapshot = await proposalsRef.get();
	const ris = [];
	snapshot.forEach((doc) => ris.push(doc.data()));
	return ris;
}

app.get("/get_proposals", async (req, res) => {
	const ris = await getAllProposals()
	return res.send(ris);
});

app.post("/update_proposal", async (req, res) => {
	console.log(req.body)

	const obj = req.body;

	const docRef = admin.firestore().collection("proposals").doc(obj.id);
	const doc = await docRef.get()
	if (doc.exists) {
		// Document exists, update it
		await docRef.update({
			votes: obj.votes,
		});
	} else {
		// Document does not exist, create it
		await docRef.set(obj);
	}

	return res.send("Success proposal updating");

	/*
	docRef
		.get()
		.then((doc) => {
			if (doc.exists) {
				// Document exists, update it
				return docRef.update({
					votes: obj.votes,
				});
			} else {
				// Document does not exist, create it
				return docRef.set(obj);
			}
		})
		.catch((error) => {
			console.log("Error proposal updating:", error);
		});
	*/

	const ris = await getAllProposals()
	console.log("-------------------------")
	console.log(ris)
	return res.send(ris);

	// return res.send("Success proposal updating");
});


app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});

// Export the Express API
module.exports = app;
