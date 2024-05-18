/* jshint esversion: 11 */

const {
	SlashCommandBuilder
} = require('discord.js');
const config = require("../config/aod-discord-bot.config.json");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('user')
		.setDescription('Manage a user')
		.addSubcommand(command => command.setName('kick').setDescription('Kicks a user from the server')
			.addUserOption(option => option.setName('user').setDescription('User').setRequired(true))
			.addStringOption(option => option.setName('reason').setDescription('Kick reason')))
		.addSubcommand(command => command.setName('ban').setDescription('Bans a user from the server')
			.addUserOption(option => option.setName('user').setDescription('User').setRequired(true))
			.addStringOption(option => option.setName('reason').setDescription('Ban reason')))
		.addSubcommand(command => command.setName('mute').setDescription('Adds the Muted role to a user')
			.addUserOption(option => option.setName('user').setDescription('User').setRequired(true)))
		.addSubcommand(command => command.setName('unmute').setDescription('Removes the Muted role from a user')
			.addUserOption(option => option.setName('user').setDescription('User').setRequired(true)))
		.addSubcommand(command => command.setName('setptt').setDescription('Adds the PTT role to a user')
			.addUserOption(option => option.setName('user').setDescription('User').setRequired(true)))
		.addSubcommand(command => command.setName('clearptt').setDescription('Removes the PTT role from a user')
			.addUserOption(option => option.setName('user').setDescription('User').setRequired(true))),
	help: true,
	checkPerm(perm, commandName, parentName) {
		switch (commandName) {
			case 'kick':
				return perm >= global.PERM_RECRUITER
			case 'ban':
			case 'mute':
			case 'unmute':
			case 'setptt':
			case 'clearptt':
				return perm >= global.PERM_MOD;
		}
		return false;
	},
	async autocomplete(interaction, member, perm, permName) {
		const subCommand = interaction.options.getSubcommand();
		const focusedOption = interaction.options.getFocused(true);
		let search = focusedOption.value.toLowerCase();
		switch (subCommand) {}
	},
	async execute(interaction, member, perm, permName) {
		const subCommand = interaction.options.getSubcommand();
		let targetMember = interaction.options.getMember('user');

		if (!targetMember && subCommand !== 'ban')
			return interaction.reply({ content: 'User is invalid or left the server.', ephemeral: true });

		switch (subCommand) {
			case 'kick': {
				if (!targetMember.kickable)
					return interaction.reply({ content: `I cannot kick ${targetMember.user.username}.`, ephemeral: true });

				let [targetPerm, targetPermName] = global.getPermissionLevelForMember(targetMember);
				if (perm <= targetPerm)
					return interaction.reply({ content: `You cannot kick ${targetMember.user.username}.`, ephemeral: true });

				let reason = interaction.options.getString('reason') ?? "No reason provided";

				targetMember.kick(`Requested by ${global.getNameFromMessage(interaction)}: ${reason}`)
					.catch(error => interaction.reply({ content: `Sorry, I couldn't kick because of : ${error}`, ephemeral: true }));
				return interaction.reply({ content: `${targetMember.user.username} has been kicked by ${member.user} because: ${reason}`, ephemeral: true });
			}
			case 'ban': {
				let userToBan;
				if (targetMember) {
					//Handle members still in server
					if (!targetMember.bannable)
						return interaction.reply({ content: `I cannot ban ${targetMember.user.username}.`, ephemeral: true });

					let [targetPerm, targetPermName] = global.getPermissionLevelForMember(targetMember);
					if (perm <= targetPerm)
						return interaction.reply({ content: `You cannot ban ${targetMember.user.username}.`, ephemeral: true });

					userToBan = targetMember.user;
				} else {
					//Handle disconnected users
					userToBan = interaction.options.getUser('user');
				}

				let reason = interaction.options.getString('reason') ?? "No reason provided";

				interaction.guild.members.ban(userToBan, { reason: `Requested by ${global.getNameFromMessage(interaction)}: ${reason}` })
					.catch(error => interaction.reply({ content: `Sorry, I couldn't ban because of : ${error}`, ephemeral: true }));
				return interaction.reply({ content: `${userToBan.username} has been banned by ${member.user} because: ${reason}`, ephemeral: true });
			}
			case 'mute':
			case 'unmute': {
				let [targetPerm, targetPermName] = global.getPermissionLevelForMember(targetMember);
				if (perm <= targetPerm)
					return interaction.reply({ content: `You cannot mute ${targetMember.user.username}.`, ephemeral: true });

				return addRemoveRole(interaction, interaction.guild, subCommand === 'mute', config.muteRole, targetMember, false);
			}
			case 'setptt':
			case 'clearptt': {
				let [targetPerm, targetPermName] = global.getPermissionLevelForMember(targetMember);
				if (perm <= targetPerm)
					return interaction.reply({ content: `You cannot make ${targetMember.user.username} PTT.`, ephemeral: true });

				return addRemoveRole(interaction, interaction.guild, subCommand === 'setptt', config.pttRole, targetMember, false);
			}
		}
	}
};
