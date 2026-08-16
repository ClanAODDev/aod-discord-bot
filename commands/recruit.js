/* jshint esversion: 11 */

const {
	SlashCommandBuilder,
	ContextMenuCommandBuilder,
	ApplicationCommandType,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	MessageFlags
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('recruit')
		.setDescription('Get a link to confirm and recruit a member into AOD Tracker')
		.addUserOption(option => option.setName('user').setDescription('User').setRequired(true)),
	menuCommands: [
		new ContextMenuCommandBuilder()
			.setName('Recruit')
			.setType(ApplicationCommandType.User)
	],
	help: true,
	checkPerm(perm, commandName) {
		return perm >= global.PERM_RECRUITER;
	},
	checkMenuPerm(perm, commandName) {
		return perm >= global.PERM_RECRUITER;
	},
	async execute(interaction, guild, member, perm) {
		const targetMember = interaction.options.getMember('user');
		if (!targetMember) {
			return global.ephemeralReply(interaction, 'Please mention a valid member of this server.');
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const recruitURL = `${global.config.trackerURL}/recruit/discord/${targetMember.id}`;
		const openLink = new ButtonBuilder()
			.setLabel('Confirm & Recruit')
			.setURL(recruitURL)
			.setStyle(ButtonStyle.Link);
		const row = new ActionRowBuilder().addComponents(openLink);

		return global.ephemeralReply(interaction, {
			embeds: [{
				description: `Confirm ${targetMember}'s pending registration and start recruitment in AOD Tracker.`,
				thumbnail: { url: targetMember.displayAvatarURL({ extension: 'png' }) }
			}],
			components: [row]
		});
	},
	async menu(interaction, guild, member, perm) {
		return module.exports.execute(interaction, guild, member, perm);
	}
};
