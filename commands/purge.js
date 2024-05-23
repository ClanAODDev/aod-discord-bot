/* jshint esversion: 11 */

const {
	SlashCommandBuilder,
} = require('discord.js');
const config = require("../config/aod-discord-bot.config.json");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('purge')
		.setDescription('Purges the last [num] messages from the channel')
		.addIntegerOption(option => option.setName('num').setDescription('Number of messages to purge (1 <= num <= 100)').setRequired(true)),
	help: true,
	checkPerm(perm, commandName) {
		switch (commandName) {
			case 'purge':
				return perm >= global.PERM_STAFF;
		}
		return false;
	},
	async execute(interaction, member, perm, permName) {
		let deleteCount = interaction.options.getInteger('num');

		if (deleteCount < 1 || deleteCount > 100)
			return global.ephemeralReply(interaction, "Please provide a number between 1 and 100 for the number of messages to delete");

		await interaction.deferReply({ ephemeral: true });
		try {
			let fetched = await interaction.channel.messages.fetch({ limit: deleteCount });
			await interaction.channel.bulkDelete(fetched);

			return global.ephemeralReply(interaction, `Purged ${fetched.size} message(s) from the channel`);
		} catch (e) {
			return global.ephemeralReply(interaction, `Couldn't delete messages because of: ${e}`);
		}
	}
};
