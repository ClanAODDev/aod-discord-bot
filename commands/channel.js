/* jshint esversion: 11 */

const {
	SlashCommandBuilder,
	PermissionFlagsBits,
	ChannelType,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle
} = require('discord.js');

const typeChoices = [
	{ name: 'Voice Channel', value: 'voice' },
	{ name: 'PTT Voice Channel', value: 'ptt' },
	{ name: 'Join to Create Voice', value: 'jtc' },
	{ name: 'Text', value: 'text' },
];

const permChoices = [
	{ name: 'Feed', value: 'feed' },
	{ name: 'Guest+', value: 'guest' },
	{ name: 'Member+', value: 'member' },
	{ name: 'Role Locked', value: 'role' },
	{ name: 'Officer+', value: 'officer' },
	{ name: 'Sgt+', value: 'mod' },
	{ name: 'MSgt+', value: 'staff' },
	{ name: 'Admin Only', value: 'admin' },
];

function sortAndLimitOptions(options, len, search) {
	let count = 0;
	return options
		.sort()
		.filter(o => {
			if (count >= len) {
				return false;
			} else if (o.toLowerCase().startsWith(search)) {
				count++;
				return true;
			} else {
				return false;
			}
		})
		.map(o => ({ name: o, value: o }));
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('channel')
		.setDescription('Add, remove or update a channel')
		.addSubcommand(command => command.setName('add').setDescription('Create a new channel')
			.addStringOption(option => option.setName('name').setDescription('Channel Name').setRequired(true))
			.addStringOption(option => option.setName('type').setDescription('Channel Type (default=Voice)').setChoices(...typeChoices))
			.addStringOption(option => option.setName('perm').setDescription('Channel Permissions (default=Member)').setChoices(...permChoices))
			.addChannelOption(option => option.setName('category').setDescription('Category for the channel').addChannelTypes(ChannelType.GuildCategory))
			.addStringOption(option => option.setName('role').setDescription('Channel Role for role locked channels').setAutocomplete(true)))
		.addSubcommand(command => command.setName('delete').setDescription('Delete an existing channel')
			.addChannelOption(option => option.setName('channel').setDescription('Channel to delete').setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)))
		.addSubcommand(command => command.setName('topic').setDescription('Set the topic for a channel')
			.addStringOption(option => option.setName('topic').setDescription('Channel Topic (leave empty to clear topic)'))
			.addChannelOption(option => option.setName('channel').setDescription('Channel to update').addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)))
		.addSubcommand(command => command.setName('update').setDescription('Update the permissions for a channel')
			.addStringOption(option => option.setName('perm').setDescription('Channel Permissions (default=Member)').setRequired(true).setChoices(...permChoices))
			.addChannelOption(option => option.setName('channel').setDescription('Channel to update').addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice))
			.addStringOption(option => option.setName('role').setDescription('Channel Role for role locked channels').setAutocomplete(true)))
		.addSubcommand(command => command.setName('rename').setDescription('Rename a channel')
			.addChannelOption(option => option.setName('channel').setDescription('Channel to rename').setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice))
			.addStringOption(option => option.setName('name').setDescription('Channel Name').setRequired(true)))
		.addSubcommand(command => command.setName('move').setDescription('Move a channel')
			.addChannelOption(option => option.setName('channel').setDescription('Channel to move').setRequired(true))),
	help: true,
	async autocomplete(interaction, member, perm, permName) {
		const subCommand = interaction.options.getSubcommand();
		const focusedOption = interaction.options.getFocused(true);
		let search = focusedOption.value.toLowerCase();
		switch (subCommand) {
			case 'add':
			case 'update': {
				if (focusedOption.name === 'role') {
					await interaction.respond(sortAndLimitOptions(global.getUserRoles(false, null).concat(global.getUserRoles(true, null)), 25, search));
				}
				break;
			}
		}
	},
	async execute(interaction, member, perm, permName) {
		const subCommand = interaction.options.getSubcommand();
		switch (subCommand) {
			case 'add': {
				if (perm < global.PERM_RECRUITER)
					return interaction.reply({ content: "You do not have permissions to create channels", ephemeral: true });

				let name = interaction.options.getString('name').toLowerCase().replace(/\s/g, '-');
				let type = interaction.options.getString('type') ?? 'voice';
				let level = interaction.options.getString('perm') ?? 'member';
				let category = interaction.options.getChannel('category');
				let roleName = interaction.options.getString('role');

				let officerRole;
				if (category) {
					//check if this category has an associated officer role
					let officerRoleName = category.name + ' ' + global.config.discordOfficerSuffix;
					officerRole = interaction.guild.roles.cache.find(r => { return r.name == officerRoleName; });
					if (perm < global.PERM_DIVISION_COMMANDER)
						return interaction.reply({ content: "You do not have permissions to create permanent channels", ephemeral: true });
					if (perm == global.PERM_DIVISION_COMMANDER && (!officerRole || !member.roles.cache.get(officerRole.id)))
						return interaction.reply({ content: "You can only add channels to a division you command", ephemeral: true });
					if (perm < global.PERM_STAFF && category.children.size >= config.maxChannelsPerCategory)
						return interaction.reply({ content: "Category is full", ephemeral: true });

					let prefix = category.name.toLowerCase().replace(/\s/g, '-') + '-';
					if (name.indexOf(prefix) < 0)
						name = prefix + name;
				} else {
					if (type === 'text')
						return interaction.reply({ content: "A category must be set for text channels", ephemeral: true });
					if (type === 'jtc')
						return interaction.reply({ content: "A category must be set for join-to-create channels", ephemeral: true });

					category = interaction.guild.channels.cache.find(c => { return c.name == config.tempChannelCategory; });
					if (!category)
						return interaction.reply({ content: "Temp channel category not found", ephemeral: true });
				}

				let role;
				if (roleName)
					role = interaction.guild.roles.cache.find(r => { return r.name == roleName; });
				if (role) {
					if (level !== 'role')
						return interaction.reply({ content: "Channel Permissions must be 'role' if a Role is selected", ephemeral: true });
					if (perm < global.PERM_DIVISION_COMMANDER)
						return interaction.reply({ content: "You do not have permissions to create role locked channels", ephemeral: true });
				} else if (level === 'role') {
					return interaction.reply({ content: "Role must be provided if Channel Permissions is 'role'", ephemeral: true });
				}

				let existingChannel = interaction.guild.channels.cache.find(c => { return c.name == name; });
				if (existingChannel)
					return interaction.reply({ content: "Channel already exists", ephemeral: true });

				await interaction.deferReply({ ephemeral: true });
				return global.addChannel(interaction.guild, interaction, member, perm, name, type, level, category, officerRole, role);
			}
			case 'delete': {
				if (perm < global.PERM_DIVISION_COMMANDER)
					return interaction.reply({ content: "You do not have permissions to delete channels", ephemeral: true });

				let channel = interaction.options.getChannel('channel');
				let channelName = channel.name;
				if (global.config.protectedChannels.includes(channelName))
					return interaction.reply({ content: `${channel} is a protected channel.`, ephemeral: true });

				let category = channel.parent;
				if (category) {
					//check if this category has an associated officer role
					let officerRoleName = category.name + ' ' + global.config.discordOfficerSuffix;
					let officerRole = interaction.guild.roles.cache.find(r => { return r.name == officerRoleName; });
					if (perm == global.PERM_DIVISION_COMMANDER && (!officerRole || !member.roles.cache.get(officerRole.id)))
						return interaction.reply({ content: 'You can only delete channels from a division you command', ephemeral: true });
				} else {
					if (perm < PERM_STAFF)
						return interaction.reply({ content: 'You cannot delete this channel', ephemeral: true });
				}

				const confirm = new ButtonBuilder()
					.setCustomId('confirm_channel_delete')
					.setLabel('Confirm Delete')
					.setStyle(ButtonStyle.Danger);
				const cancel = new ButtonBuilder()
					.setCustomId('cancel_channel_delete')
					.setLabel('Cancel')
					.setStyle(ButtonStyle.Secondary);
				const row = new ActionRowBuilder()
					.addComponents(cancel, confirm);
				const response = await interaction.reply({
					content: `Are you sure you want to delete ${channel}?`,
					components: [row],
					ephemeral: true
				});

				const filter = (i) => (i.customId === 'confirm_channel_delete' || i.customId === 'cancel_channel_delete') && i.user.id === interaction.user.id;
				try {
					const confirmation = await response.awaitMessageComponent({ filter: filter, time: 10000 });
					if (confirmation.customId === 'confirm_channel_delete') {
						await channel.delete(`Requested by ${global.getNameFromMessage(interaction)}`);
						if (interaction.channel.id !== channel.id) {
							await confirmation.update({
								content: `Channel #${channelName} deleted`,
								components: []
							});
						}
					} else if (confirmation.customId === 'cancel_channel_delete') {
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
			case 'topic': {
				let topic = interaction.options.getString('topic') ?? "";
				let channel = interaction.options.getChannel('channel') ?? interaction.channel;
				if (!channel)
					return interaction.reply({ content: "Please provide a channel or execute in a text channel", ephemeral: true });
				if (perm < global.PERM_MOD) {
					let category = channel.parent;
					if (category) {
						let officerRoleName = category.name + ' ' + global.config.discordOfficerSuffix;
						let officerRole = interaction.guild.roles.cache.find(r => { return r.name == officerRoleName; });
						if (!officerRole || !member.roles.cache.get(officerRole.id)) {
							if (global.tempChannelCreatedBy(channel.id) !== member.id) {
								return interaction.reply({ content: "You do not have permissions to edit this channel.", ephemeral: true });
							}
						}
					} else {
						return interaction.reply({ content: "You do not have permissions to edit this channel.", ephemeral: true });
					}
				}

				await interaction.deferReply({ ephemeral: true });
				if (channel.type === ChannelType.GuildText) {
					return channel.setTopic(topic, `Requested by ${global.getNameFromMessage(interaction)}`);
				} else if (channel.type === ChannelType.GuildVoice) {
					//return interaction.editReply({ content: "Not supported.", ephemeral: true });
					return interaction.client.rest.put(`/channels/${channel.id}/voice-status`, {
						body: {
							status: topic,
							reason: `Requested by ${global.getNameFromMessage(interaction)}`
						}
					});
				}
				break;
			}
			case 'update': {
				if (perm < global.PERM_STAFF)
					return interaction.reply({ content: "You do not have permissions to update channel permissions", ephemeral: true });

				let level = interaction.options.getString('perm') ?? 'member';
				let roleName = interaction.options.getString('role');
				let channel = interaction.options.getChannel('channel') ?? interaction.channel;
				let channelName = channel.name;
				if (global.config.protectedChannels.includes(channelName))
					return interaction.reply({ content: `${channel} is a protected channel`, ephemeral: true });

				let category = channel.parent;
				let officerRole;
				if (category) {
					//check if this category has an associated officer role
					let officerRoleName = category.name + ' ' + global.config.discordOfficerSuffix;
					officerRole = interaction.guild.roles.cache.find(r => { return r.name == officerRoleName; });
					if (perm == global.PERM_DIVISION_COMMANDER && (!officerRole || !member.roles.cache.get(officerRole.id)))
						return interaction.reply({ content: 'You can only update channels from a division you command', ephemeral: true });
				} else {
					if (perm < PERM_STAFF)
						return interaction.reply({ content: 'You cannot update this channel', ephemeral: true });
				}

				let role;
				if (roleName)
					role = interaction.guild.roles.cache.find(r => { return r.name == roleName; });
				if (role) {
					if (level !== 'role')
						return interaction.reply({ content: "Channel Permissions must be 'role' if a Role is selected", ephemeral: true });
					if (perm < global.PERM_DIVISION_COMMANDER)
						return interaction.reply({ content: "You do not have permissions to create role locked channels", ephemeral: true });
				} else if (level === 'role') {
					return interaction.reply({ content: "Role must be provided if Channel Permissions is 'role'", ephemeral: true });
				}
				await interaction.deferReply({ ephemeral: true });
				return setChannelPerms(interaction.guild, interaction, member, perm, channel, level, category, officerRole, role);
			}
			case 'rename': {
				if (perm < global.PERM_DIVISION_COMMANDER)
					return interaction.reply({ content: "You do not have permissions to rename channels", ephemeral: true });

				let name = interaction.options.getString('name').toLowerCase().replace(/\s/g, '-');
				let channel = interaction.options.getChannel('channel') ?? interaction.channel;
				let channelName = channel.name;
				if (channel.type === ChannelType.GuildCategory)
					return interaction.reply({ content: `Cannot rename a category`, ephemeral: true });
				if (global.config.protectedChannels.includes(channelName))
					return interaction.reply({ content: `${channel} is a protected channel`, ephemeral: true });

				let category = channel.parent;
				if (category) {
					//check if this category has an associated officer role
					let officerRoleName = category.name + ' ' + global.config.discordOfficerSuffix;
					let officerRole = interaction.guild.roles.cache.find(r => { return r.name == officerRoleName; });
					if (perm == global.PERM_DIVISION_COMMANDER && (!officerRole || !member.roles.cache.get(officerRole.id)))
						return interaction.reply({ content: 'You can only rename channels from a division you command', ephemeral: true });
					let divisionPrefix = category.name.toLowerCase().replace(/\s/g, '-');
					if (!name.startsWith(divisionPrefix))
						name = divisionPrefix + '-' + name;
				} else {
					if (perm < PERM_STAFF)
						return interaction.reply({ content: 'You cannot rename this channel', ephemeral: true });
				}

				let existingChannel = interaction.guild.channels.cache.find(c => { return c.name == name; });
				if (existingChannel)
					return interaction.reply({ content: `A channel already exists with the name ${existingChannel}`, ephemeral: true });

				await interaction.deferReply({ ephemeral: true });
				await channel.setName(name, `Requested by ${global.getNameFromMessage(interaction)}`);
				return interaction.editReply({ content: `#${channelName} renamed to ${channel}`, ephemeral: true });
			}
			case 'move': {
				if (perm < global.PERM_DIVISION_COMMANDER)
					return interaction.reply({ content: "You do not have permissions to move channels", ephemeral: true });

				let channel = interaction.options.getChannel('channel') ?? interaction.channel;
				let category = channel.parent;
				if (category) {
					//check if this category has an associated officer role
					let officerRoleName = category.name + ' ' + global.config.discordOfficerSuffix;
					let officerRole = interaction.guild.roles.cache.find(r => { return r.name == officerRoleName; });
					if (perm == global.PERM_DIVISION_COMMANDER && (!officerRole || !member.roles.cache.get(officerRole.id)))
						return interaction.reply({ content: 'You can only move channels in a division you command', ephemeral: true });
					let divisionPrefix = category.name.toLowerCase().replace(/\s/g, '-');
				} else {
					if (perm < PERM_STAFF)
						return interaction.reply({ content: 'You cannot rename this channel', ephemeral: true });
				}

				const up = new ButtonBuilder()
					.setCustomId('move_channel_up')
					.setLabel('Up')
					.setStyle(ButtonStyle.Success);
				const down = new ButtonBuilder()
					.setCustomId('move_channel_down')
					.setLabel('Down')
					.setStyle(ButtonStyle.Primary);
				const done = new ButtonBuilder()
					.setCustomId('move_channel_done')
					.setLabel('Done')
					.setStyle(ButtonStyle.Secondary);
				const row = new ActionRowBuilder()
					.addComponents(up, down, done);
				const response = await interaction.reply({
					content: `Move ${channel}...`,
					components: [row],
					ephemeral: true
				});

				const filter = (i) =>
					(i.customId === 'move_channel_up' ||
						i.customId === 'move_channel_down' ||
						i.customId === 'move_channel_done') &&
					i.user.id === interaction.user.id;
				while (1) {
					try {
						const action = await response.awaitMessageComponent({ filter: filter, time: 30000 });
						if (action.customId === 'move_channel_up') {
							await channel.setPosition(-1, { relative: true, reason: `Requested by ${global.getNameFromMessage(interaction)}` });
						} else if (action.customId === 'move_channel_down') {
							await channel.setPosition(1, { relative: true, reason: `Requested by ${global.getNameFromMessage(interaction)}` });
						} else {
							return interaction.editReply({ content: 'Done', components: [], ephemeral: true });
						}
						await action.update({
							content: `Move ${channel}...`,
							components: [row],
							ephemeral: true
						});
					} catch (e) {
						return await interaction.editReply({ content: 'Timeout', components: [], ephemeral: true });
					}
				}
				break;
			}
		}
	}
};
