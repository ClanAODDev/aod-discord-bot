/* jshint esversion: 11 */

const {
	SlashCommandBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle
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
			.addStringOption(option => option.setName('reason').setDescription('Ban reason'))
			.addIntegerOption(option => option.setName('delete-messages').setDescription('Message purge duration')
				.addChoices({ name: '10 minutes', value: 600 }, { name: '30 minutes', value: 1800 }, { name: '1 hour', value: 3600 }, { name: '1 day', value: 86400 }, )))
		.addSubcommand(command => command.setName('mute').setDescription('Adds the Muted role to a user')
			.addUserOption(option => option.setName('user').setDescription('User').setRequired(true)))
		.addSubcommand(command => command.setName('unmute').setDescription('Removes the Muted role from a user')
			.addUserOption(option => option.setName('user').setDescription('User').setRequired(true)))
		.addSubcommand(command => command.setName('setptt').setDescription('Adds the PTT role to a user')
			.addUserOption(option => option.setName('user').setDescription('User').setRequired(true)))
		.addSubcommand(command => command.setName('clearptt').setDescription('Removes the PTT role from a user')
			.addUserOption(option => option.setName('user').setDescription('User').setRequired(true))),
	help: true,
	checkPerm(perm, commandName) {
		switch (commandName) {
			case 'user':
			case 'kick':
				return perm >= global.PERM_RECRUITER;
			case 'ban':
			case 'mute':
			case 'unmute':
			case 'setptt':
			case 'clearptt':
				return perm >= global.PERM_MOD;
		}
		return false;
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

				const confirm = new ButtonBuilder()
					.setCustomId('confirm_user_kick')
					.setLabel('Confirm Kick')
					.setStyle(ButtonStyle.Danger);
				const cancel = new ButtonBuilder()
					.setCustomId('cancel_user_kick')
					.setLabel('Cancel')
					.setStyle(ButtonStyle.Secondary);
				const row = new ActionRowBuilder()
					.addComponents(cancel, confirm);
				const response = await interaction.reply({
					content: `Are you sure you want to kick ${targetMember} from the server?`,
					components: [row],
					ephemeral: true
				});

				const filter = (i) => (i.customId === 'confirm_user_kick' || i.customId === 'cancel_user_kick') && i.user.id === interaction.user.id;
				try {
					const confirmation = await response.awaitMessageComponent({ filter: filter, time: 10000 });
					if (confirmation.customId === 'confirm_user_kick') {
						await targetMember.kick(`Requested by ${global.getNameFromMessage(interaction)}: ${reason}`)
							.catch(error => interaction.reply({ content: `Sorry, I couldn't kick because of : ${error}`, ephemeral: true }));
						await confirmation.update({
							content: `${targetMember} has been kicked for: ${reason}`,
							components: []
						}).catch(() => {});
					} else if (confirmation.customId === 'cancel_user_kick') {
						await confirmation.update({
							content: 'Cancelled',
							components: []
						});
					}
				} catch (e) {
					await interaction.editReply({ content: 'Timeout waiting for confirmation', components: [], ephemeral: true });
				}
				break;
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
				let purgeDuration = interaction.options.getInteger('delete-messages') ?? 0

				const confirm = new ButtonBuilder()
					.setCustomId('confirm_user_ban')
					.setLabel('Confirm Ban')
					.setStyle(ButtonStyle.Danger);
				const cancel = new ButtonBuilder()
					.setCustomId('cancel_user_ban')
					.setLabel('Cancel')
					.setStyle(ButtonStyle.Secondary);
				const row = new ActionRowBuilder()
					.addComponents(cancel, confirm);
				const response = await interaction.reply({
					content: `Are you sure you want to ban ${userToBan} from the server?`,
					components: [row],
					ephemeral: true
				});

				const filter = (i) => (i.customId === 'confirm_user_ban' || i.customId === 'cancel_user_ban') && i.user.id === interaction.user.id;
				try {
					const confirmation = await response.awaitMessageComponent({ filter: filter, time: 10000 });
					if (confirmation.customId === 'confirm_user_ban') {
						await interaction.guild.members.ban(userToBan, { reason: `Requested by ${global.getNameFromMessage(interaction)}: ${reason}`, deleteMessageSeconds: purgeDuration })
							.catch(error => interaction.reply({ content: `Sorry, I couldn't ban because of : ${error}`, ephemeral: true }));
						await confirmation.update({
							content: `${userToBan} has been banned for: ${reason}`,
							components: []
						}).catch(() => {});
					} else if (confirmation.customId === 'cancel_user_ban') {
						await confirmation.update({
							content: 'Cancelled',
							components: []
						});
					}
				} catch (e) {
					await interaction.editReply({ content: 'Timeout waiting for confirmation', components: [], ephemeral: true });
				}
				break;
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
