const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActivityType,
  REST,
  Routes,
  MessageFlags
} = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { iniciarCronJobs } = require('./cron/scheduler.js');

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Message, Partials.Channel, Partials.User]
});

client.commands = new Map();

// JSON y Maps separados
const PARTY_FILE = './partys.json';
const MARITIMA_FILE = './maritimas.json';
const LIGA_FILE = './ligas.json';
const BOSES_FILE = './boses.json';
const MIRU_FILE = './miru.json';
const ALTAR_FILE = './altar.json';
const NODE_FILE = './node.json';

const PARTYCONFIG_FILE = './party-config.json';

const gruposParty = new Map();
const gruposMaritima = new Map();
const gruposLiga = new Map();
const configBoses = new Map();
const gruposMiru = new Map();
const gruposAltar = new Map();
const gruposNode = new Map();
const configParty = new Map();

// ---------- PARTY ----------
function savePartys() {
  const obj = Object.fromEntries(gruposParty);
  fs.writeFileSync(PARTY_FILE, JSON.stringify(obj, null, 2));
}

function loadPartys() {
  if (fs.existsSync(PARTY_FILE)) {
    const obj = JSON.parse(fs.readFileSync(PARTY_FILE));
    gruposParty.clear();
    for (const [key, value] of Object.entries(obj)) {
      gruposParty.set(key, value);
    }
  }
}

// ---------- PARTY CONFIG ----------
function savePartyConfig() {
  const obj = Object.fromEntries(configParty);
  fs.writeFileSync(PARTYCONFIG_FILE, JSON.stringify(obj, null, 2));
}

function loadPartyConfig() {
  if (fs.existsSync(PARTYCONFIG_FILE)) {
    const obj = JSON.parse(fs.readFileSync(PARTYCONFIG_FILE));
    configParty.clear();
    for (const [key, value] of Object.entries(obj)) {
      configParty.set(key, value);
    }
  }
}

// ---------- MIRU ----------
function saveMiru() {
  const obj = Object.fromEntries(gruposMiru);
  fs.writeFileSync(MIRU_FILE, JSON.stringify(obj, null, 2));
}

function loadMiru() {
  if (fs.existsSync(MIRU_FILE)) {
    const obj = JSON.parse(fs.readFileSync(MIRU_FILE));
    gruposMiru.clear();
    for (const [key, value] of Object.entries(obj)) {
      gruposMiru.set(key, value);
    }
  }
}

if (fs.existsSync(MIRU_FILE)) {
  const obj = JSON.parse(fs.readFileSync(MIRU_FILE));
  gruposMiru.clear();
  for (const [key, value] of Object.entries(obj)) {
    gruposMiru.set(key, value);
  }
}

// ---------- ALTAR ----------
function saveAltar() {
  const obj = Object.fromEntries(gruposAltar);
  fs.writeFileSync(ALTAR_FILE, JSON.stringify(obj, null, 2));
}

function loadAltar() {
  if (fs.existsSync(ALTAR_FILE)) {
    const obj = JSON.parse(fs.readFileSync(ALTAR_FILE));
    gruposAltar.clear();
    for (const [key, value] of Object.entries(obj)) {
      gruposAltar.set(key, value);
    }
  }
}

if (fs.existsSync(ALTAR_FILE)) {
  const obj = JSON.parse(fs.readFileSync(ALTAR_FILE));
  gruposAltar.clear();
  for (const [key, value] of Object.entries(obj)) {
    gruposAltar.set(key, value);
  }
}

// ---------- MARITIMA ----------
function saveMaritimas() {
  const obj = Object.fromEntries(gruposMaritima);
  fs.writeFileSync(MARITIMA_FILE, JSON.stringify(obj, null, 2));
}

function loadMaritimas() {
  if (fs.existsSync(MARITIMA_FILE)) {
    const obj = JSON.parse(fs.readFileSync(MARITIMA_FILE));
    gruposMaritima.clear();
    for (const [key, value] of Object.entries(obj)) {
      gruposMaritima.set(key, value);
    }
  }
}

// ---------- NODE ----------
function saveNodes() {
  const obj = Object.fromEntries(gruposNode);
  fs.writeFileSync(NODE_FILE, JSON.stringify(obj, null, 2));
}

function loadNodes() {
  if (fs.existsSync(NODE_FILE)) {
    const obj = JSON.parse(fs.readFileSync(NODE_FILE));
    gruposNode.clear();
    for (const [key, value] of Object.entries(obj)) {
      gruposNode.set(key, value);
    }
  }
}

// ---------- LIGA ----------
function saveLigas() {
  const obj = Object.fromEntries(gruposLiga);
  fs.writeFileSync(LIGA_FILE, JSON.stringify(obj, null, 2));
}

function loadLigas() {
  if (fs.existsSync(LIGA_FILE)) {
    const obj = JSON.parse(fs.readFileSync(LIGA_FILE));
    gruposLiga.clear();
    for (const [key, value] of Object.entries(obj)) {
      gruposLiga.set(key, value);
    }
  }
}

// ---------- BOSES ----------
function saveBoses() {
  const obj = Object.fromEntries(configBoses);
  fs.writeFileSync(BOSES_FILE, JSON.stringify(obj, null, 2));
}

function loadBoses() {
  if (fs.existsSync(BOSES_FILE)) {
    const obj = JSON.parse(fs.readFileSync(BOSES_FILE));
    configBoses.clear();
    for (const [key, value] of Object.entries(obj)) {
      configBoses.set(key, value);
    }
  }
}

// Cargar comandos desde ./commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);

    if (command.data.name === 'party') {
      command.gruposActivos = gruposParty;
      command.savePartys = savePartys;
      command.configParty = configParty;
      command.savePartyConfig = savePartyConfig;
    } else if (command.data.name === 'config-party') {
      command.configParty = configParty;
      command.savePartyConfig = savePartyConfig;
    } else if (command.data.name === 'liga') {
      command.gruposActivos = gruposLiga;
      command.savePartys = saveLigas;
    } else if (command.data.name === 'maritima') {
      command.gruposActivos = gruposMaritima;
      command.savePartys = saveMaritimas;
    } else if (command.data.name === 'boses') {
      command.configBoses = configBoses;
      command.saveBoses = saveBoses;
    } else if (command.data.name === 'config-boses') {
      command.configBoses = configBoses;
      command.saveBoses = saveBoses;
    } else if (command.data.name === 'miru') {
      command.gruposActivos = gruposMiru;
      command.saveMiru = saveMiru;
    } else if (command.data.name === 'altar') {
      command.gruposActivos = gruposAltar;
      command.saveAltar = saveAltar;
    } else if (command.data.name === 'node') {
      command.gruposActivos = gruposNode;
      command.saveNodes = saveNodes;
    }
  } else {
    console.log(`[WARNING] Comando mal formado en ${file}`);
  }
}

// ---- REGISTRO AUTOMATICO DE SLASH COMMANDS GLOBAL ----
async function registrarComandosGlobal() {
  const slashCommands = [];
  for (const cmd of client.commands.values()) {
    if (cmd.data && typeof cmd.data.toJSON === 'function') {
      slashCommands.push(cmd.data.toJSON());
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('🔃 Registrando comandos GLOBALMENTE...');
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: slashCommands }
    );
    console.log('✅ Comandos globales registrados correctamente');
  } catch (error) {
    console.error('❌ Error registrando comandos:', error);
  }
}

client.once(Events.ClientReady, async () => {
  console.log('Bot listo');
  client.user.setActivity('/help', { type: ActivityType.Playing });

  loadPartys();
  loadPartyConfig();
  loadMaritimas();
  loadLigas();
  loadBoses();
  loadMiru();
  loadAltar();
  loadNodes();

  await registrarComandosGlobal();

  // iniciarCronJobs(client);
});

// ROUTER DE INTERACCIONES
client.on(Events.InteractionCreate, async interaction => {
  console.log('[interactionCreate]', {
    commandName: interaction.commandName,
    customId: interaction.customId,
    type: interaction.type
  });

  // Slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) {
      return interaction.reply({ content: 'Comando no encontrado', flags: MessageFlags.Ephemeral });
    }

    try {
      if (interaction.commandName === 'party') {
        await command.execute(interaction, gruposParty, savePartys, client);
      } else if (interaction.commandName === 'config-party') {
        await command.execute(interaction, configParty, savePartyConfig, client);
      } else if (interaction.commandName === 'maritima') {
        await command.execute(interaction, gruposMaritima, saveMaritimas, client);
      } else if (interaction.commandName === 'liga') {
        await command.execute(interaction, gruposLiga, saveLigas, client);
      } else if (interaction.commandName === 'boses') {
        await command.execute(interaction, configBoses, saveBoses, client);
      } else if (interaction.commandName === 'config-boses') {
        await command.execute(interaction, configBoses, saveBoses, client);
      } else if (interaction.commandName === 'miru') {
        await command.execute(interaction, gruposMiru, saveMiru, client);
      } else if (interaction.commandName === 'altar') {
        await command.execute(interaction, gruposAltar, saveAltar, client);
      } else if (interaction.commandName === 'node') {
        await command.execute(interaction, gruposNode, saveNodes, client);
      } else {
        await command.execute(interaction, null, null, client);
      }
    } catch (error) {
      console.error('[slash] Error ejecutando el comando:', error);
      try {
        await interaction.reply({ content: 'Error ejecutando el comando.', flags: MessageFlags.Ephemeral });
      } catch { }
    }
    return;
  }

  // Botones / selects / modales
  if (
    interaction.isButton() ||
    interaction.isModalSubmit() ||
    (interaction.isUserSelectMenu && interaction.isUserSelectMenu()) ||
    (interaction.isStringSelectMenu && interaction.isStringSelectMenu())
  ) {
    try {
      const id = interaction.customId || '';
      let handled = false;

      // PARTY
      if (
        (id.startsWith('party_') || id.startsWith('party_add_select:')) &&
        id !== 'party_config_modal'
      ) {
        const partyCommand = client.commands.get('party');
        if (partyCommand && typeof partyCommand.handleInteraction === 'function') {
          await partyCommand.handleInteraction(interaction, gruposParty, savePartys, client, configParty);
          handled = true;
        }
      }

      // CONFIG-PARTY
      if ((id === 'party_config_modal') && !handled) {
        if (interaction.isModalSubmit()) {
          const configPartyCommand = client.commands.get('config-party');
          if (configPartyCommand && typeof configPartyCommand.handleInteraction === 'function') {
            await configPartyCommand.handleInteraction(interaction, configParty, savePartyConfig, client);
            handled = true;
          }
        }
      }

      // MIRU
      if ((id.startsWith('miru_') || id.startsWith('miru_add_select:')) && !handled) {
        const miruCommand = client.commands.get('miru');
        if (miruCommand && typeof miruCommand.handleInteraction === 'function') {
          await miruCommand.handleInteraction(interaction, gruposMiru, saveMiru, client);
          handled = true;
        }
      }

      // ALTAR
      if ((id.startsWith('altar_') || id.startsWith('altar_add_select:') || id.startsWith('altar_kick_select:')) && !handled) {
        const altarCommand = client.commands.get('altar');
        if (altarCommand && typeof altarCommand.handleInteraction === 'function') {
          await altarCommand.handleInteraction(interaction, gruposAltar, saveAltar, client);
          handled = true;
        }
      }

      // MARITIMA
      if ((id.startsWith('maritima_') || id.startsWith('maritima_add_select:')) && !handled) {
        const maritimaCommand = client.commands.get('maritima');
        if (maritimaCommand && typeof maritimaCommand.handleInteraction === 'function') {
          await maritimaCommand.handleInteraction(interaction, gruposMaritima, saveMaritimas, client);
          handled = true;
        }
      }

      // NODE
      if ((id.startsWith('node_') || id.startsWith('node_add_select:')) && !handled) {
        const nodeCommand = client.commands.get('node');
        if (nodeCommand && typeof nodeCommand.handleInteraction === 'function') {
          await nodeCommand.handleInteraction(interaction, gruposNode, saveNodes, client);
          handled = true;
        }
      }

      // LIGA
      if ((id.startsWith('liga_') || id.startsWith('liga_add_select:')) && !handled) {
        const ligaCommand = client.commands.get('liga');
        if (ligaCommand && typeof ligaCommand.handleInteraction === 'function') {
          await ligaCommand.handleInteraction(interaction, gruposLiga, saveLigas, client);
          handled = true;
        }
      }

      // BOSES
      if ((id === 'boses_config') && !handled) {
        const bosesCommand = client.commands.get('boses');
        if (bosesCommand && typeof bosesCommand.handleInteraction === 'function') {
          await bosesCommand.handleInteraction(interaction, configBoses, saveBoses, client);
          handled = true;
        }
      }

      // CONFIG-BOSES
      if ((id === 'boses_config_modal') && !handled) {
        if (interaction.isModalSubmit()) {
          const configBosesCommand = client.commands.get('config-boses');
          if (configBosesCommand && typeof configBosesCommand.handleInteraction === 'function') {
            await configBosesCommand.handleInteraction(interaction, configBoses, saveBoses, client);
            handled = true;
          }
        }
      }

      // ANUNCIO MODAL
      if ((id === 'anuncio_modal') && !handled) {
        if (interaction.isModalSubmit()) {
          const anuncioCommand = client.commands.get('anuncio');
          if (anuncioCommand && typeof anuncioCommand.handleInteraction === 'function') {
            await anuncioCommand.handleInteraction(interaction, null, null, client);
            handled = true;
          }
        }
      }

      if (!handled) {
        console.log('[interactionCreate] customId sin router:', id);
      }
    } catch (error) {
      console.error('[component] Error procesando la interaccion:', error);
      try {
        if (interaction.isRepliable()) {
          await interaction.reply({ content: 'Error procesando la interaccion.', flags: MessageFlags.Ephemeral });
        }
      } catch { }
    }
  }
});

client.login(token);