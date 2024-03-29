/* jshint esversion: 11 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('roll')
		.setDescription('Roll a dice')
		.addIntegerOption(option => option.setName('dice').setDescription('The number of dice to roll (1-20)').setMinValue(1).setMaxValue(20))
		.addIntegerOption(option => option.setName('sides').setDescription('The number of sides on the dice (1-100)').setMinValue(1).setMaxValue(100)),
	help: true,
	async execute(interaction) {
		const num = interaction.options.getInteger('dice') ?? 1;
		const size = interaction.options.getInteger('sides') ?? 6;
		let reply = `${num}d${size} result: `;
		let total = 0;
		for (let i = 0; i < num; i++) {
			let result = Math.floor(Math.random() * size) + 1;
			total += result;
			if (i > 0)
				reply += ', ';
			reply += result;
		}
		if (num > 1)
			reply += ` (total: ${total})`;
		return interaction.reply(reply);
	},
};
