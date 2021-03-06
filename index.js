'use strict'
const jsonfile = require('jsonfile')
const alfy = require('alfy')
const Conf = require('conf')
const WorkflowError = require('./src/utils/error')
const {errorAction} = require('./src/utils/error')
const set = require('./src/cmd/set')
const del = require('./src/cmd/del')
const refresh = require('./src/cmd/refresh')
const decks = require('./src/anki/anki-decks')
const {modelExist} = require('./src/anki/anki-decks')
const api = require('./src/api')

const config = new Conf()
config.clear()

/* eslint-disable prefer-destructuring */
const myVar = process.argv[3]
/* eslint-enable prefer-destructuring */

let query
const introMessage = [{
	subtitle: `Current deck is ⇒ ${alfy.config.get('default-deck')}`
}]

if (myVar === 'headword') {
	query = {
		headword: `${alfy.input}`,
		limit: 50
	}
	introMessage[0].title = 'Search headwords ...'
}
if (myVar === 'search') {
	query = {
		search: `${alfy.input}`,
		limit: 50
	}
	introMessage[0].title = 'Search generic ...'
}
if (myVar === 'decks') {
	alfy.input = '!set default-deck '
}

const fileAnkiDecks = './src/input/anki-decks.json'
const commands = [set, del, refresh]
const option = async input => {
	for (const command of commands) {
		if (command.match(input)) {
			return command(input)
		}
	}

	// No matches, show all commands
	if (/!.*/.test(input)) {
		const options = commands.map(command => ({
			title: command.meta.name,
			subtitle: `${command.meta.help} | Usage: ${command.meta.usage}`,
			autocomplete: command.meta.autocomplete,
			text: {
				largetype: `${command.meta.help} | Usage: ${command.meta.usage}`
			},
			icon: command.meta.icon,
			valid: false
		}))
		return alfy.inputMatches(options, 'title')
	}

	if (input === '') {
		await modelExist()
		const ankiDecks = await decks()
		if (ankiDecks === null) {
			throw new WorkflowError(`Decks was not found, check your Anki profile`, errorAction('profile'))
		}
		jsonfile.writeFile(fileAnkiDecks, ankiDecks, {
			spaces: 2
		}, err => {
			if (err !== null) {
				console.log(err)
			}
		})
		return introMessage
	}
}

(async () => {
	try {
		const out = await option(alfy.input)
		if (out || /!.*/.test(alfy.input)) {
			alfy.output(out)
		} else {
			api.fetching(query)
		}
	} catch (err) {
		const messages = []

		if (err.tip) {
			messages.push(err.tip)
		}

		messages.push('Activate this item to try again.')
		messages.push('⌘L to see the stack trace')

		alfy.output([{
			title: err.title ? err.title : `${err.message}`,
			subtitle: err.subtitle ? err.subtitle : messages.join(' | '),
			autocomplete: err.autocomplete ? err.autocomplete : '',
			icon: err.icon ? err.icon : {path: alfy.icon.error},
			valid: err.valid ? err.valid : false,
			variables: err.variables ? err.variables : {},
			text: {
				largetype: `${err.subtitle}\n\n${err.stack}`,
				copy: err.stack
			},
			mods: err.mods ? err.mods : {mods: {}}
		}])
	}
})()
