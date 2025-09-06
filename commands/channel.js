/* jshint esversion: 11 */

const {
	SlashCommandBuilder,
	PermissionFlagsBits,
	ChannelType,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	MessageFlags
} = require('discord.js');

const typeChoices = [
	{ name: 'VAD', value: 'voice' },
	{ name: 'PTT Only', value: 'ptt' },
	{ name: 'JTC', value: 'jtc' },
	{ name: 'Text', value: 'text' },
];

function getTypeDisplay(type) {
	for (let i in typeChoices) {
		const choice = typeChoices[i];
		if (choice.value === type)
			return choice.name;
	}
	return 'Category';
}

const permChoices = [
	{ name: 'Feed', value: 'feed' },
	{ name: 'Feed (Role Locked)', value: 'role-feed' },
	{ name: 'Public', value: 'public' },
	{ name: 'Guest+', value: 'guest' },
	{ name: 'Member+', value: 'member' },
	{ name: 'Role Locked', value: 'role' },
	{ name: 'Officer+', value: 'officer' },
	{ name: 'Sgt+', value: 'mod' },
	{ name: 'MSgt+', value: 'staff' },
	{ name: 'Admin Only', value: 'admin' },
];

function getPermDisplay(perm) {
	for (let i in permChoices) {
		const choice = permChoices[i];
		if (choice.value === perm)
			return choice.name;
	}
	return 'Unknown';
}

const voiceTypeChoices = [
	{ name: 'VAD', value: 'voice' },
	{ name: 'PTT Only', value: 'ptt' },
];

function getRolePermString(roleInfo, everyone) {
	if (!roleInfo.view)
		if (everyone)
			return 'No Access';
		else
			return 'Default Permissions';
	let perms = 'View';
	if (roleInfo.send)
		perms = perms + ', Send';
	if (roleInfo.connect)
		perms = perms + ', Connect';
	if (roleInfo.manage)
		perms = perms + ', Manage';
	return perms;
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
			.addChannelOption(option => option.setName('channel').setDescription('Channel to delete').setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildForum)))
		.addSubcommand(command => command.setName('topic').setDescription('Set the topic for a channel')
			.addStringOption(option => option.setName('topic').setDescription('Channel Topic (leave empty to clear topic)'))
			.addChannelOption(option => option.setName('channel').setDescription('Channel to update').addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildForum)))
		.addSubcommand(command => command.setName('announce').setDescription('Send an announcement')
			.addStringOption(option => option.setName('role').setDescription('Role to mention').setRequired(true).setAutocomplete(true))
			.addStringOption(option => option.setName('message').setDescription('Message').setRequired(true)))
		.addSubcommand(command => command.setName('update').setDescription('Update the permissions for a channel')
			.addStringOption(option => option.setName('perm').setDescription('Channel Permissions (default=Member)').setRequired(true).setChoices(...permChoices))
			.addChannelOption(option => option.setName('channel').setDescription('Channel to update').addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildForum))
			.addStringOption(option => option.setName('role').setDescription('Channel Role for role locked channels').setAutocomplete(true))
			.addStringOption(option => option.setName('type').setDescription('Voice Type (ignored for text)').setChoices(...voiceTypeChoices)))
		.addSubcommand(command => command.setName('rename').setDescription('Rename a channel')
			.addChannelOption(option => option.setName('channel').setDescription('Channel to rename').setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildForum))
			.addStringOption(option => option.setName('name').setDescription('Channel Name').setRequired(true)))
		.addSubcommand(command => command.setName('move').setDescription('Move a channel')
			.addChannelOption(option => option.setName('channel').setDescription('Channel to move').setRequired(true)))
		.addSubcommand(command => command.setName('info').setDescription('Channel information')
			.addChannelOption(option => option.setName('channel').setDescription('Channel')))
		.addSubcommand(command => command.setName('purge').setDescription('Purges messages from the current channel')
			.addIntegerOption(option => option.setName('num').setDescription('Number of messages to purge').setRequired(true))),
	help: true,
	checkPerm(perm, commandName, parentName) {
		switch (commandName) {
			case 'channel':
			case 'topic':
				return perm >= global.PERM_MEMBER;
			case 'info':
			case 'add':
				return perm >= global.PERM_RECRUITER;
			case 'announce':
			case 'delete':
			case 'rename':
			case 'move':
			case 'update':
				return perm >= global.PERM_DIVISION_COMMANDER;
			case 'purge':
				return perm >= global.PERM_STAFF;
		}
		return false;
	},
	async autocomplete(interaction, guild, member, perm) {
		const subCommand = interaction.options.getSubcommand();
		const focusedOption = interaction.options.getFocused(true);
		let search = focusedOption.value.toLowerCase();
		switch (subCommand) {
			case 'add':
			case 'update': {
				if (focusedOption.name === 'role') {
					return interaction.respond(global.sortAndLimitOptions(
						global.getUserRoleNames(guild, false, null).concat(global.getUserRoleNames(guild, true, null)), 25, search));
				}
				break;
			}
			case 'announce': {
				if (focusedOption.name === 'role') {
					let roles = [];
					let category = interaction.channel.parent;
					if (category) {
						if (perm >= global.PERM_DIVISION_COMMANDER) {
							let officerRoleName = category.name + ' ' + global.config.discordOfficerSuffix;
							let officerRole = guild.roles.cache.find(r => { return r.name == officerRoleName; });
							let memberRoleName = category.name + ' ' + global.config.discordMemberSuffix;
							let memberRole = guild.roles.cache.find(r => { return r.name == memberRoleName; });
							if (perm >= global.PERM_STAFF || (officerRole && member.roles.cache.get(officerRole.id))) {
								if (officerRole)
									roles.push(officerRoleName);
								if (memberRole)
									roles.push(memberRoleName);
							}
						}
					}
					if (perm >= global.PERM_STAFF) {
						roles.push(global.config.memberRole);
						roles.push(global.config.officerRole);
					}
					return interaction.respond(global.sortAndLimitOptions(roles, 25, search));
				}
				break;
			}
		}
		return Promise.reject();
	},
	async execute(interaction, guild, member, perm) {
		const subCommand = interaction.options.getSubcommand();
		switch (subCommand) {
			case 'add': {
				let name = interaction.options.getString('name').toLowerCase().replace(/\s/g, '-');
				let type = interaction.options.getString('type') ?? 'voice';
				let level = interaction.options.getString('perm') ?? 'member';
				let category = interaction.options.getChannel('category');
				let roleName = interaction.options.getString('role');
				let role;

				let officerRole;
				if (category) {
					let prefix;
					let divisions = await global.getDivisionsFromTracker();
					let divisionData = divisions[category.name];
					if (typeof(divisionData) !== 'undefined') {
						prefix = divisionData.abbreviation;
					} else {
						prefix = category.name.toLowerCase().replace(/\s/g, '-');
					}
					if (name.indexOf(prefix) < 0)
						name = prefix + '-' + name;

					//check if this category has an associated officer role
					let officerRoleName = category.name + ' ' + global.config.discordOfficerSuffix;
					officerRole = guild.roles.cache.find(r => { return r.name == officerRoleName; });
					if (perm < global.PERM_DIVISION_COMMANDER)
						return global.ephemeralReply(interaction, "You do not have permissions to create permanent channels");
					if (perm == global.PERM_DIVISION_COMMANDER && (!officerRole || !member.roles.cache.get(officerRole.id)))
						return global.ephemeralReply(interaction, "You can only add channels to a division you command");
					if (perm < global.PERM_STAFF && category.children.size >= config.maxChannelsPerCategory)
						return global.ephemeralReply(interaction, "Category is full");

					if (officerRole) {
						if (!divisionData || !divisionData.alwaysVisible) {
							if (level === 'member') {
								let memberRoleName = category.name + ' ' + global.config.discordMemberSuffix;
								role = guild.roles.cache.find(r => { return r.name == memberRoleName; });
							} else if (level === 'guest' || level === 'public' || level === 'feed') {
								let divisionRoleName = category.name;
								role = guild.roles.cache.find(r => { return r.name == divisionRoleName; });
							}
							if (role) {
								roleName = null;
								if (level === 'feed')
									level = 'role-feed';
								else
									level = 'role';
							}
						}
					}
				} else {
					if (type === 'text')
						return global.ephemeralReply(interaction, "A category must be set for text channels");
					if (type === 'jtc')
						return global.ephemeralReply(interaction, "A category must be set for join-to-create channels");

					category = guild.channels.cache.find(c => { return c.name == config.tempChannelCategory; });
					if (!category)
						return global.ephemeralReply(interaction, "Temp channel category not found");
				}

				if (roleName)
					role = guild.roles.cache.find(r => { return r.name == roleName; });
				if (role) {
					if (level !== 'role' && level !== 'role-feed')
						return global.ephemeralReply(interaction, "Channel Permissions must be 'role' if a Role is selected");
					if (perm < global.PERM_DIVISION_COMMANDER)
						return global.ephemeralReply(interaction, "You do not have permissions to create role locked channels");
				} else if (level === 'role' || level === 'role-feed') {
					return global.ephemeralReply(interaction, "Role must be provided if Channel Permissions is 'role'");
				}

				let existingChannel = guild.channels.cache.find(c => { return c.name == name; });
				if (existingChannel)
					return global.ephemeralReply(interaction, "Channel already exists");

				await interaction.deferReply({ flags: MessageFlags.Ephemeral });
				await global.addChannel(guild, interaction, member, perm, name, type, level, category, officerRole, role);
				return global.updateOnboarding(guild);
			}
			case 'delete': {
				let channel = interaction.options.getChannel('channel');
				let channelName = channel.name;
				if (global.config.protectedChannels.includes(channelName))
					return global.ephemeralReply(interaction, `${channel} is a protected channel.`);

				let category = channel.parent;
				if (category) {
					//check if this category has an associated officer role
					let officerRoleName = category.name + ' ' + global.config.discordOfficerSuffix;
					let officerRole = guild.roles.cache.find(r => { return r.name == officerRoleName; });
					if (perm == global.PERM_DIVISION_COMMANDER && (!officerRole || !member.roles.cache.get(officerRole.id)))
						return global.ephemeralReply(interaction, 'You can only delete channels from a division you command');
				} else {
					if (perm < PERM_STAFF)
						return global.ephemeralReply(interaction, 'You cannot delete this channel');
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
					flags: MessageFlags.Ephemeral
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
					await interaction.editReply({ content: 'Timeout waiting for confirmation', components: [], flags: MessageFlags.Ephemeral });
				}
				return Promise.resolve();
			}
			case 'topic': {
				let topic = interaction.options.getString('topic') ?? "";
				let channel = interaction.options.getChannel('channel') ?? interaction.channel;
				if (!channel)
					return global.ephemeralReply(interaction, "Please provide a channel or execute in a text channel");
				if (perm < global.PERM_MOD) {
					let category = channel.parent;
					if (category) {
						let officerRoleName = category.name + ' ' + global.config.discordOfficerSuffix;
						let officerRole = guild.roles.cache.find(r => { return r.name == officerRoleName; });
						if (!officerRole || !member.roles.cache.get(officerRole.id)) {
							if (global.tempChannelCreatedBy(channel.id) !== member.id) {
								return global.ephemeralReply(interaction, "You do not have permissions to edit this channel.");
							}
						}
					} else {
						return global.ephemeralReply(interaction, "You do not have permissions to edit this channel.");
					}
				}

				await interaction.deferReply({ flags: MessageFlags.Ephemeral });
				if (channel.type === ChannelType.GuildText) {
					return channel.setTopic(topic, `Requested by ${global.getNameFromMessage(interaction)}`);
				} else if (channel.type === ChannelType.GuildVoice) {
					//return interaction.editReply({ content: "Not supported.", flags: MessageFlags.Ephemeral });
					return interaction.client.rest.put(`/channels/${channel.id}/voice-status`, {
						body: {
							status: topic,
							reason: `Requested by ${global.getNameFromMessage(interaction)}`
						}
					});
				}
				break;
			}
			case 'announce': {
				let message = interaction.options.getString('message');
				let channel = interaction.channel;
				let category = channel.parent;
				let role = interaction.options.getString('role');
				role = guild.roles.cache.find(r => { return r.name == role; });
				if (!role) {
					return global.ephemeralReply(interaction, "Select a role to mention in the announcement.");
				}
				if (perm < global.PERM_STAFF) {
					if (category) {
						let officerRoleName = category.name + ' ' + global.config.discordOfficerSuffix;
						let officerRole = guild.roles.cache.find(r => { return r.name == officerRoleName; });
						if (!officerRole || !member.roles.cache.get(officerRole.id)) {
							return global.ephemeralReply(interaction, "You do not have permissions to announce in this channel.");
						}
					} else {
						return global.ephemeralReply(interaction, "You do not have permissions to edit this channel.");
					}
					if (!role.name.startsWith(category.name)) {
						return global.ephemeralReply(interaction, "You do not have permissions to announce using the selected role.");
					}
				}

				let embed = {
					author: {
						name: member.displayName
					},
					description: message
				};

				return channel.send({
					content: `:mega: ${role}`,
					embeds: [embed]
				});
			}
			case 'update': {
				let level = interaction.options.getString('perm') ?? 'member';
				let type = interaction.options.getString('type') ?? null;
				let roleName = interaction.options.getString('role');
				let channel = interaction.options.getChannel('channel') ?? interaction.channel;
				let channelName = channel.name;
				if (global.config.protectedChannels.includes(channelName))
					return global.ephemeralReply(interaction, `${channel} is a protected channel`);
				let role;

				let category = channel.parent;
				let officerRole;
				if (category) {
					let divisions = await global.getDivisionsFromTracker();
					let divisionData = divisions[category.name];

					//check if this category has an associated officer role
					let officerRoleName = category.name + ' ' + global.config.discordOfficerSuffix;
					officerRole = guild.roles.cache.find(r => { return r.name == officerRoleName; });
					if (perm == global.PERM_DIVISION_COMMANDER && (!officerRole || !member.roles.cache.get(officerRole.id)))
						return global.ephemeralReply(interaction, 'You can only update channels from a division you command');

					if (officerRole) {
						if (!divisionData || !divisionData.alwaysVisible) {
							if (level === 'member') {
								let memberRoleName = category.name + ' ' + global.config.discordMemberSuffix;
								role = guild.roles.cache.find(r => { return r.name == memberRoleName; });
							} else if (level === 'guest' || level === 'public' || level === 'feed') {
								let divisionRoleName = category.name;
								role = guild.roles.cache.find(r => { return r.name == divisionRoleName; });
							}
							if (role) {
								roleName = null;
								if (level === 'feed')
									level = 'role-feed';
								else
									level = 'role';
							}
						}
					}
				} else {
					if (perm < PERM_STAFF)
						return global.ephemeralReply(interaction, 'You cannot update this channel');
				}

				if (roleName)
					role = guild.roles.cache.find(r => { return r.name == roleName; });
				if (role) {
					if (level !== 'role' && level !== 'role-feed')
						return global.ephemeralReply(interaction, "Channel Permissions must be 'role' if a Role is selected");
					if (perm < global.PERM_DIVISION_COMMANDER)
						return global.ephemeralReply(interaction, "You do not have permissions to create role locked channels");
				} else if (level === 'role' || level === 'role-feed') {
					return global.ephemeralReply(interaction, "Role must be provided if Channel Permissions is 'role'");
				}
				await interaction.deferReply({ flags: MessageFlags.Ephemeral });
				return global.setChannelPerms(guild, interaction, member, perm, channel, type, level, category, officerRole, role);
			}
			case 'rename': {
				let name = interaction.options.getString('name').toLowerCase().replace(/\s/g, '-');
				let channel = interaction.options.getChannel('channel') ?? interaction.channel;
				let channelName = channel.name;
				if (channel.type === ChannelType.GuildCategory)
					return global.ephemeralReply(interaction, `Cannot rename a category`);
				if (global.config.protectedChannels.includes(channelName))
					return global.ephemeralReply(interaction, `${channel} is a protected channel`);

				let category = channel.parent;
				if (category) {
					//check if this category has an associated officer role
					let officerRoleName = category.name + ' ' + global.config.discordOfficerSuffix;
					let officerRole = guild.roles.cache.find(r => { return r.name == officerRoleName; });
					if (perm == global.PERM_DIVISION_COMMANDER && (!officerRole || !member.roles.cache.get(officerRole.id)))
						return global.ephemeralReply(interaction, 'You can only rename channels from a division you command');

					let prefix;
					let divisions = await global.getDivisionsFromTracker();
					let divisionData = divisions[category.name];
					if (typeof(divisionData) !== 'undefined') {
						prefix = divisionData.abbreviation;
					} else {
						prefix = category.name.toLowerCase().replace(/\s/g, '-');
					}
					if (!name.startsWith(prefix))
						name = prefix + '-' + name;
				} else {
					if (perm < PERM_STAFF)
						return global.ephemeralReply(interaction, 'You cannot rename this channel');
				}

				let existingChannel = guild.channels.cache.find(c => { return c.name == name; });
				if (existingChannel)
					return global.ephemeralReply(interaction, `A channel already exists with the name ${existingChannel}`);

				await interaction.deferReply({ flags: MessageFlags.Ephemeral });
				await channel.setName(name, `Requested by ${global.getNameFromMessage(interaction)}`);
				return interaction.editReply({ content: `#${channelName} renamed to ${channel}`, flags: MessageFlags.Ephemeral });
			}
			case 'move': {
				let channel = interaction.options.getChannel('channel') ?? interaction.channel;
				let category = channel.parent;
				if (category) {
					//check if this category has an associated officer role
					let officerRoleName = category.name + ' ' + global.config.discordOfficerSuffix;
					let officerRole = guild.roles.cache.find(r => { return r.name == officerRoleName; });
					if (perm == global.PERM_DIVISION_COMMANDER && (!officerRole || !member.roles.cache.get(officerRole.id)))
						return global.ephemeralReply(interaction, 'You can only move channels in a division you command');
					let divisionPrefix = category.name.toLowerCase().replace(/\s/g, '-');
				} else {
					if (perm < PERM_STAFF)
						return global.ephemeralReply(interaction, 'You cannot rename this channel');
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
					flags: MessageFlags.Ephemeral
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
							return interaction.editReply({ content: 'Done', components: [], flags: MessageFlags.Ephemeral });
						}
						await action.update({
							content: `Move ${channel}...`,
							components: [row],
							flags: MessageFlags.Ephemeral
						});
					} catch (e) {
						return await interaction.editReply({ content: 'Timeout', components: [], flags: MessageFlags.Ephemeral });
					}
				}
				return Promise.resolve();
			}
			case 'info': {
				let channel = interaction.options.getChannel('channel') ?? interaction.channel;

				await interaction.deferReply({ flags: MessageFlags.Ephemeral });
				info = await global.getChannelInfo(guild, channel);

				let embed = {
					description: `**Information for ${channel}**`,
					fields: [{
						name: 'Channel Type',
						value: getTypeDisplay(info.type)
					}, {
						name: 'Permission Level',
						value: getPermDisplay(info.perm)
					}],
				};

				if (info.details.officer) {
					embed.fields.push({
						name: 'Officer Role (' + getRolePermString(info.details.officer) + ')',
						value: `${info.details.officer.role}`
					});
				}
				if (info.details.divisionMember) {
					embed.fields.push({
						name: 'Division Member Role (' + getRolePermString(info.details.divisionMember) + ')',
						value: `${info.details.divisionMember.role}`
					});
				}
				if (info.details.division) {
					embed.fields.push({
						name: 'Division Role (' + getRolePermString(info.details.division) + ')',
						value: `${info.details.division.role}`
					});
				} else {
					if (info.details.role) {
						embed.fields.push({
							name: 'Channel Role (' + getRolePermString(info.details.role) + ')',
							value: `${info.details.role.role}`
						});
					} else if (info.details.member) {
						embed.fields.push({
							name: 'Member Role (' + getRolePermString(info.details.member) + ')',
							value: `${info.details.member.role}`
						});
					}
				}
				embed.fields.push({
					name: 'Everyone (' + getRolePermString(info.details.everyone, true) + ')',
					value: ''
				});

				return global.ephemeralReply(interaction, embed);
			}
			case 'purge': {
				let deleteCount = interaction.options.getInteger('num');

				if (deleteCount < 1 || deleteCount > 100)
					return global.ephemeralReply(interaction, "Please provide a number between 1 and 100 for the number of messages to delete");

				await interaction.deferReply({ flags: MessageFlags.Ephemeral });
				try {
					let fetched = await interaction.channel.messages.fetch({ limit: deleteCount });
					await interaction.channel.bulkDelete(fetched);

					return global.ephemeralReply(interaction, `Purged ${fetched.size} message(s) from the channel`);
				} catch (error) {
					console.error(error);
					return global.ephemeralReply(interaction, 'An error occurred purging messages');
				}
				break;
			}
		}
		return Promise.reject();
	},
	async button(interaction, guild, member, perm, subCommand, args) {
		if (args.length < 1) {
			return global.ephemeralReply(interaction, 'Invalid request.');
		}

		const createdBy = global.tempChannelCreatedBy(interaction.channel.id);
		if (!createdBy) {
			return global.ephemeralReply(interaction, 'This is not a JTC channel');
		}

		const channel = interaction.channel;
		const category = channel.parent;
		if (!category) {
			return global.ephemeralReply(interaction, 'JTC must be in a division category.');
		}

		const channelInfo = await global.getChannelInfo(guild, channel);
		let creator;
		if (createdBy != member.id) {
			if (perm < global.PERM_MOD && !member.roles.cache.has(channelInfo.details.officer.role.id)) {
				return global.ephemeralReply(interaction, 'You are not the channel owner.');
			}
			creator = guild.members.resolve(createdBy);
		} else {
			creator = member;
		}

		switch (subCommand) {
			case 'set_jtc_public':
			case 'set_jtc_member':
			case 'set_jtc_officer':
			case 'set_jtc_vad':
			case 'set_jtc_ptt': {
				let role = null;
				let level = 'role';
				let type = null;
				if (subCommand == 'set_jtc_public') {
					if (channelInfo.details.division && channelInfo.details.division.role) {
						role = channelInfo.details.division.role;
						channelInfo.perm = 'role';
					} else {
						level = 'public';
						channelInfo.perm = 'public';
					}
					channelInfo.divPerm = 'public';
				} else if (subCommand == 'set_jtc_member') {
					if (channelInfo.details.divisionMember && channelInfo.details.divisionMember.role) {
						role = channelInfo.details.divisionMember.role;
						channelInfo.perm = 'role';
					} else {
						level = 'member';
						channelInfo.perm = 'member';
					}
					channelInfo.divPerm = 'member';
				} else if (subCommand == 'set_jtc_officer') {
					if (perm < global.PERM_MOD && !member.roles.cache.has(channelInfo.details.officer.role.id)) {
						return global.ephemeralReply(interaction, 'You do not have permissions to set this channel type.');
					}
					level = 'officer';
					channelInfo.perm = 'officer';
					channelInfo.divPerm = 'officer';
				} else {
					if (channelInfo.divPerm == 'public') {
						role = channelInfo.details.division.role;
					} else if (channelInfo.divPerm == 'member') {
						role = channelInfo.details.divisionMember.role;
					} else {
						level = 'officer';
					}
					if (subCommand == 'set_jtc_vad') {
						type = 'voice';
						channelInfo.type = 'voice';
					} else if (subCommand == 'set_jtc_ptt') {
						type = 'ptt';
						channelInfo.type = 'ptt';
					}
				}

				return global.setChannelPerms(guild, interaction, member, perm, channel, type, level, category, channelInfo.details.officer.role, role, creator)
					.then(async function() {
						const buttons = getJTCButtons(channelInfo, member);
						await interaction.message.edit({ components: buttons });
					});
			}
			case 'set_jtc_status': {
				const modal = new ModalBuilder()
					.setCustomId(global.getButtonIdString('channel', 'set_jtc_status', [interaction.channel.id]))
					.setTitle('Voice Channel Status');
				const statusInput = new TextInputBuilder()
					.setCustomId('status')
					.setLabel('Enter the new voice channel status:')
					.setMaxLength(30)
					.setRequired(false)
					.setStyle(TextInputStyle.Short);
				const actionRow = new ActionRowBuilder()
					.addComponents(statusInput);
				modal.addComponents(actionRow);

				return interaction.showModal(modal);
			}
			case 'toggle_jtc_recording': {
				return global.setChannelRecordingIndicator(interaction.channel);
			}
			default:
				return global.ephemeralReply(interaction, 'Invalid request.');
		}
		return Promise.reject();
	},
	async modal(interaction, guild, member, perm, subCommand, args) {
		if (args.length < 1) {
			return global.ephemeralReply(interaction, 'Invalid request.');
		}
		switch (subCommand) {
			case 'set_jtc_status': {
				const createdBy = global.tempChannelCreatedBy(interaction.channel.id);
				if (!createdBy) {
					return global.ephemeralReply(interaction, 'This is not a JTC channel');
				}

				const channel = interaction.channel;
				const category = channel.parent;
				if (!category) {
					return global.ephemeralReply(interaction, 'JTC must be in a division category.');
				}

				if (createdBy != member.id) {
					const channelInfo = await global.getChannelInfo(guild, channel);
					if (perm < global.PERM_MOD && !member.roles.cache.has(channelInfo.details.officer.role.id)) {
						return global.ephemeralReply(interaction, 'You are not the channel owner.');
					}
				}

				let topic = interaction.fields.getTextInputValue('status') ?? "";
				return interaction.client.rest.put(`/channels/${interaction.channel.id}/voice-status`, {
					body: {
						status: topic,
						reason: `Requested by ${global.getNameFromMessage(interaction)}`
					}
				});
			}
			default:
				return global.ephemeralReply(interaction, 'Invalid request.');
		}
		return Promise.reject();
	}
};
