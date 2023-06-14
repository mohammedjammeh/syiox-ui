import { ethers } from './ethers-5.1.esm.min.js';
import { linkupAddress, linkupABI } from './constants/linkup.js';
import { userContractAddress, userContractABI } from './constants/user.js';

if (typeof window.ethereum == 'undefined') {
	throw new Error('Please install Metamask!');
}

/******************
	variables
******************/
// providers
const windowProvider = new ethers.providers.Web3Provider(window.ethereum);
const wssProvider = new ethers.providers.WebSocketProvider(
	'wss://eth-sepolia.g.alchemy.com/v2/ZMwWseSEcXoDOA2dkn3Q8vyGnWtynmZX'
);

// account
const accounts = await windowProvider.listAccounts();

// contracts
const linkupContract = new ethers.Contract(linkupAddress, linkupABI, windowProvider.getSigner());
const unconnectedLinkupContract = new ethers.Contract(linkupAddress, linkupABI, windowProvider);
const userContract = new ethers.Contract(userContractAddress, userContractABI, windowProvider.getSigner());

// html elements
const linkupForm = document.getElementById('linkupForm');
const profileForm = document.getElementById('profileForm');

const homeBtn = document.getElementById('homeBtn');
const profileBtn = document.getElementById('profileBtn');
const connectBtn = document.getElementById('connectBtn');

const linkupContainer = document.querySelectorAll('.linkups')[0];
const userContainer = document.querySelectorAll('.user')[0];

const userSuggestionsBtns = document.querySelectorAll('.userSuggestions button');

// others
const days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/*********************
	event handlers
*********************/
window.ethereum.on('accountsChanged', async function () {
	if (accounts.length == 0) {
		connectBtn.classList.remove('hide');
	}
});

new ethers.Contract(linkupAddress, linkupABI, wssProvider.getSigner()).on('NewLinkup', (name) => {
	console.log(name);
});

/******************
	Application
******************/

// unconnected
if (accounts.length == 0) {
	// nav
	homeBtn.addEventListener('click', connect);
	profileBtn.addEventListener('click', connect);
	connectBtn.addEventListener('click', connect);

	connectBtn.classList.remove('hide');
	setInterval(() => swingAttentionCircle(connectBtn), 800);

	// users
	userSuggestionsBtns.forEach((btn) => btn.addEventListener('click', connect));

	// linkups
	linkupForm.addEventListener('submit', (event) => {
		event.preventDefault();
		connect();
	});

	let everyoneLinkups = await unconnectedLinkupContract.getAll();
	everyoneLinkups.forEach((linkup) => buildLinkUp(linkup));

	let broadcastForms = document.querySelectorAll('.broadcastForm form');
	broadcastForms.forEach((form) => {
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			connect();
		});
	});

	let joinBtns = document.querySelectorAll('.linkup .joinBtn button');
	joinBtns.forEach((btn) => btn.addEventListener('click', connect));
} else {
	// nav
	homeBtn.addEventListener('click', () => {
		linkupContainer.classList.remove('hide');
		userContainer.classList.add('hide');
	});

	profileBtn.addEventListener('click', () => {
		linkupContainer.classList.add('hide');
		userContainer.classList.remove('hide');
	});

	// linkup form
	linkupForm.addEventListener('submit', async (event) => {
		event.preventDefault();

		let startDate = document.getElementById('startDate').value;
		let startTime = document.getElementById('startTime').value;
		let endTime = document.getElementById('endTime').value;
		let to = document.getElementById('to').value;
		let startTimeUnix = Date.parse(startDate + ' ' + startTime + ':00') / 1000;
		let endTimeUnix = Date.parse(startDate + ' ' + endTime + ':00') / 1000;

		const response = await linkupContract.create(
			'0x0A2169dfcC633289285290a61BB4d10AFA131817',
			document.getElementById('type').value,
			document.getElementById('description').value,
			document.getElementById('location').value,
			startTimeUnix,
			endTimeUnix,
			['0x0A2169dfcC633289285290a61BB4d10AFA131817', '0x0A2169dfcC633289285290a61BB4d10AFA131817']
		);

		// const txReceipt = await response.wait(1);
		// console.log('txReceipt: ', txReceipt);

		linkupContract.on('NewLinkup', (link) => {
			console.log(link);
		});

		// console.log(response);
	});

	/******************
		Profile
	******************/
	// user form
	let allUsers = await userContract.getAll();
	let clientAddress = accounts[0];
	// let clientAddress = '9826';
	let storedAccount = allUsers.find((user) => user.owner == clientAddress);

	let fullNameField = document.getElementById('fullName');
	let musicTasteFields = document.getElementsByName('musicTaste[]');

	if (storedAccount) {
		// autofill Form
		fullNameField.value = storedAccount['fullName'];
		musicTasteFields.forEach((field) => {
			if (storedAccount['musicTaste'].includes(field.value)) {
				field.checked = true;
			}
		});
	} else {
		// profile nav attention
		profileBtn.children[1].classList.add('dot');
		setInterval(() => swingAttentionCircle(profileBtn), 800);
	}

	profileForm.addEventListener('submit', async (event) => {
		event.preventDefault();

		// store profile form
		let selectedMusicTaste = [];
		musicTasteFields.forEach((field) => {
			if (field.checked) {
				selectedMusicTaste.push(field.value);
			}
		});

		const response = await userContract.create(
			'0x0A2169dfcC633289285290a61BB4d10AFA131817',
			fullNameField.value,
			selectedMusicTaste
		);
	});

	// contact form
	let searchBtn = document.querySelectorAll('.search button')[0];
	let searchField = document.querySelectorAll('.search input')[0];
	let searchContainer = document.querySelectorAll('.contacts .search + .list')[0];

	searchBtn.addEventListener('click', async (event) => {
		event.preventDefault();

		let searchValue = searchField.value.toLowerCase();
		searchContainer.innerHTML = '';

		if (searchValue === '') {
			return;
		}

		let searchUsers = allUsers.filter((user) => {
			// return user.owner !== clientAddress && user.fullName.toLowerCase().includes(searchValue);
			return user.fullName.toLowerCase().includes(searchValue);
		});

		if (searchUsers.length == 0) {
			let messageContainer = document.createElement('div');
			let messageElement = document.createElement('p');
			messageElement.innerHTML = `There are no users with the name or address: ${searchValue}.`;

			messageContainer.append(messageElement);
			searchContainer.append(messageContainer);

			return;
		}

		searchUsers.forEach((user) => {
			let searchElement = document.createElement('div');

			let nameElement = document.createElement('p');
			nameElement.classList.add('name');
			nameElement.innerHTML = user.fullName;

			let addressElement = document.createElement('p');
			addressElement.classList.add('address');
			addressElement.innerHTML = user.owner;

			let btnContainer = document.createElement('div');
			btnContainer.classList.add('removeBtnContainer');

			let btnElement = document.createElement('button');

			let btnIconElement = document.createElement('i');
			btnIconElement.classList.add('fa-solid');
			btnIconElement.classList.add('fa-circle-plus');

			btnElement.append(btnIconElement);
			btnContainer.append(btnElement);

			searchElement.append(nameElement);
			searchElement.append(addressElement);
			searchElement.append(btnContainer);
			searchContainer.append(searchElement);
		});
	});

	/******************
		Linkups
	******************/
	const allLinkups = await linkupContract.getAll();
	allLinkups.forEach((linkup) => buildLinkUp(linkup));
}

/******************
	Functions
******************/
// connect
async function connect() {
	await window.ethereum.request({ method: 'eth_requestAccounts' });
	connectBtn.classList.add('hide');
}

// nav attention
function swingAttentionCircle(btn) {
	let btnClasses = btn.classList;
	btnClasses = Object.keys(btnClasses).map((key) => btnClasses[key]);

	if (btnClasses.includes('attention')) {
		btn.classList.remove('attention');

		return;
	}

	btn.classList.add('attention');
}

// linkup
function buildLinkUp(linkup) {
	let linkupElement = document.createElement('div');
	linkupElement.classList.add('linkup');
	linkupElement.classList.add('columnContainer');
	linkupContainer.prepend(linkupElement);

	// status
	let statusElement = document.createElement('p');
	statusElement.classList.add('type');
	statusElement.innerHTML = '🎉 🎉 ' + linkup.status;
	linkupElement.appendChild(statusElement);

	// location
	let locationElement = document.createElement('p');
	locationElement.classList.add('location');
	locationElement.innerHTML = ' ' + linkup.location;
	linkupElement.appendChild(locationElement);

	let locationIconElement = document.createElement('i');
	locationIconElement.classList.add('fa-solid');
	locationIconElement.classList.add('fa-location-dot');
	locationElement.prepend(locationIconElement);

	// moment
	let momentElement = document.createElement('p');
	momentElement.classList.add('moment');
	momentElement.innerHTML = ' ' + formatMoment(linkup);
	linkupElement.appendChild(momentElement);

	let momentIconElement = document.createElement('i');
	momentIconElement.classList.add('fa-regular');
	momentIconElement.classList.add('fa-calendar');
	momentElement.prepend(momentIconElement);

	// description
	let descriptionElement = document.createElement('p');
	descriptionElement.classList.add('description');
	descriptionElement.innerHTML = ' ' + linkup.description;
	linkupElement.appendChild(descriptionElement);

	// members
	let membersContainer = document.createElement('ul');
	membersContainer.classList.add('members');
	linkupElement.appendChild(membersContainer);

	linkup.attendees.forEach((member) => {
		let memberElement = document.createElement('li');
		memberElement.innerHTML = 'Alhaji Mballow'; // member
		membersContainer.append(memberElement);

		let memberIconElement = document.createElement('i');
		memberIconElement.classList.add('fa-regular');
		memberIconElement.classList.add('fa-circle-check');
		memberElement.append(memberIconElement);
	});

	// buttons (broadcast)
	let buttonsContainer = document.createElement('div');
	buttonsContainer.classList.add('buttons');

	let broadcastFormContainer = document.createElement('div');
	broadcastFormContainer.classList.add('broadcastForm');

	let broadcastFormElement = document.createElement('form');
	let toElement = document.createElement('select');

	linkup.attendees.forEach((member) => {
		let toOptionElement = document.createElement('option');
		toOptionElement.innerHTML = 'Elliot Mass';
		toOptionElement.value = 'yooo';
		toElement.append(toOptionElement);
	});

	let submitElement = document.createElement('input');
	submitElement.value = 'Broadcast';
	submitElement.type = 'submit';

	buttonsContainer.append(broadcastFormContainer);
	broadcastFormContainer.append(broadcastFormElement);
	broadcastFormElement.append(toElement);
	broadcastFormElement.append(submitElement);
	linkupElement.appendChild(buttonsContainer);

	// buttons (join)
	let joinBtnContainer = document.createElement('div');
	joinBtnContainer.classList.add('joinBtn');

	let joinBtnElement = document.createElement('button');
	joinBtnElement.innerHTML = 'Join';

	joinBtnContainer.append(joinBtnElement);
	linkupElement.appendChild(joinBtnContainer);
}

function formatMoment(linkup) {
	let startTime = new Date(linkup.startTime.toNumber() * 1000);
	let endTime = new Date(linkup.endTime.toNumber() * 1000);

	let startHour = ('0' + startTime.getHours()).slice(-2);
	let startMins = ('0' + startTime.getMinutes()).slice(-2);

	let endHours = ('0' + endTime.getHours()).slice(-2);
	let endMins = ('0' + endTime.getMinutes()).slice(-2);

	return (
		days[startTime.getDay()] +
		' ' +
		startTime.getDate() +
		' ' +
		months[startTime.getMonth()] +
		',' +
		' ' +
		startHour +
		':' +
		startMins +
		' - ' +
		endHours +
		':' +
		endMins
	);
}

function shakeLoadingDisplay() {
	let largeLoadingElement = document.querySelectorAll('.loading span.large')[0];

	if (largeLoadingElement.classList.contains('third')) {
		largeLoadingElement.classList.remove('large');

		let firstLoadingSpan = document.querySelectorAll('.loading span:first-of-type')[0];
		firstLoadingSpan.classList.add('large');

		return;
	}

	let nextLoadingElement = document.querySelectorAll('.loading span.large + span')[0];
	nextLoadingElement.classList.add('large');
	largeLoadingElement.classList.remove('large');
}
