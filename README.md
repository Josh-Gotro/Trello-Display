# Trello Display

This tool creates professional documentation from your Trello cards. Choose your preferred interface and data source:

**Interface Options:**
- **Web Interface**: Interactive browser-based experience
- **Command Line**: Terminal-based for automation and scripting

**Data Sources:**
- **Trello API**: Direct connection to your Trello account
- **JSON Import**: Upload exported board files (no API credentials needed)

Select specific lists/columns from your boards to generate printable documentation. Perfect for creating focused documentation, status reports, and printable board views.

## ⚡ Quick Start (3 Steps)

### 1. Clone and Install
```bash
git clone https://github.com/Josh-Gotro/Trello-Display.git
cd Trello-Display
npm install
```

### 2. Get Trello API Credentials (Optional)
**Option A: Use API (Recommended)**
1. Visit https://trello.com/power-ups/admin/ and log in to your Trello account
2. Find and click on the **CTRL_ALT_DELEGATION** app
3. Click **API Key** on the left sidebar to get your **API Key**
4. Click the **Token** link on the right next to the API key to get your **Token**
5. Copy `.env.example` to `.env` and add your credentials:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file:
   ```env
   TRELLO_API_KEY=your_api_key_here
   TRELLO_TOKEN=your_token_here
   ```

**Option B: Use JSON Import (No API credentials needed)**
- Export your Trello board as JSON from Trello's export feature
- See `sampleExport.json` in the root directory for the expected format
- No API setup required!

### 3. Run the Application
```bash
npm run dev
```
Open http://localhost:3001 in your browser and start creating documentation!

**Important**: To view embedded images from Trello cards, make sure you're logged into Trello in the same browser where you're accessing localhost:3001.

## 🎯 How to Use

### Using the Web Interface

1. **Select Data Source**:
   - **API Boards**: Choose from all your accessible Trello boards (requires API credentials)
   - **JSON Import**: Upload a Trello board export file (no API credentials needed)
2. **Pick Lists**: Select which specific lists/columns to include in your documentation
3. **Configure Options**: Set title, subtitle, and display preferences
4. **Generate**: Click "Generate Documentation" to display all cards from selected lists
5. **Print or Share**: Print directly from browser or save as HTML for easy sharing

### JSON Import Feature

**No API credentials required!** You can import Trello board data using JSON export files:

1. **Export from Trello**:
   - Go to your Trello board
   - Click "Show Menu" → "More" → "Settings"
   - Click "Export JSON" to download your board data

2. **Import in the Tool**:
   - In the web interface, use the "📁 Import JSON File" section
   - Click "Choose JSON File" and select your exported file
   - The tool will automatically load the board and lists
   - Select the lists you want to include in your documentation

3. **Example Format**:
   - See `sampleExport.json` in the root directory for the expected JSON structure
   - The file should contain `name`, `lists`, and `cards` arrays

## 🚀 Features

### Web Interface
- **🌐 Web Interface** - No command line needed, everything in your browser
- **📋 Multi-Board Support** - Access all your Trello boards instantly
- **🔄 Flexible Data Sources** - Switch between API boards and JSON imports seamlessly
- **🎨 Professional Output** - Clean, formatted documentation ready for sharing
- **🔍 Live Search** - Find content instantly in generated docs
- **🖨️ Print Ready** - Optimized layouts for professional printing
- **💬 Comments Included** - Full comment threads with timestamps (API only)
- **🏷️ Label Support** - Color-coded Trello labels preserved
- **📝 Markdown Support** - Headers, bold text, code blocks, and more

### CLI Interface
- **⚡ Fast Execution** - Generate documentation directly from command line
- **📁 File Output** - Save documentation as HTML files to your local directory
- **🔧 Batch Processing** - Process multiple boards or lists in one command
- **🎯 Quick Selection** - Interactive prompts to select boards and lists
- **📊 Progress Tracking** - See real-time progress of documentation generation
- **🔄 Automation Ready** - Perfect for scripts and automated workflows

## 📋 Requirements

- **Node.js** (version 20 or higher) - [Download here](https://nodejs.org/)
- **Trello Account** - Free account works fine (or JSON export file)
- **Modern Browser** - Chrome, Firefox, Safari, or Edge

## 🔧 Available Commands

| Command | What it does |
|---------|-------------|
| `npm start` | Start the web interface (generates interface + starts server) |
| `npm run dev` | Same as `npm start` - start the web interface |
| `npm run cli` | Command-line version (no browser needed) |
| `npm run web` | Generate web interface template only |
| `npm run server` | Start API server only (for development) |

## ❓ FAQ & Troubleshooting

### "Error loading boards"
- **Check your `.env` file** - Make sure your API key and token are correct
- **Verify Trello permissions** - The token needs read access to your boards
- **Try JSON import instead** - Use the "📁 Import JSON File" feature (no API credentials needed)
- **Try the CLI version** - Run `npm run cli` to test your API credentials

### "Invalid Trello board JSON format"
- **Use Trello's export feature** - Go to your board → Show Menu → More → Settings → Export JSON
- **Check the format** - See `sampleExport.json` in the root directory for the expected structure
- **Ensure it's a board export** - The JSON should contain `name`, `lists`, and `cards` arrays

### "Port already in use" / Can't connect
- **Default port is 3001** - Try http://localhost:3001 (not 3000)
- **Change port if needed** - Edit `api-server.js` and look for `PORT = 3001`
- **Kill other processes** - Something else might be using port 3001

### "Cannot find module" errors
- **Run npm install** - Make sure all dependencies are installed
- **Check Node.js version** - You need Node.js 20 or higher
- **Try deleting node_modules** - Then run `npm install` again

### Getting Trello API Credentials (Detailed)
1. **Go to https://trello.com/power-ups/admin/** and log in to your Trello account
2. **Find and click on the CTRL_ALT_DELEGATION app**
3. **Click "API Key" on the left sidebar** to get your API_KEY
4. **Click "Generate Token" link on the right** next to the API key
5. **Copy the long string** that appears (this is your TOKEN)
6. **Add both to your .env file** as shown in step 2 above

## 🎨 What You Get

Your generated documentation includes:
- **📊 Hierarchical structure** - Lists become sections, cards become subsections
- **🔍 Built-in search** - Find any content instantly
- **💬 Comments preserved** - All Trello comments with timestamps
- **🏷️ Visual labels** - Color-coded tags from Trello
- **📝 Rich formatting** - Headers, bold text, code blocks
- **🔗 Clickable cards** - Link back to original Trello cards
- **📱 Mobile friendly** - Works on all devices
- **🖨️ Print ready** - Professional layouts for PDF/printing

## 🛠️ For Developers

- **Sample Data** - See `sampleExport.json` for JSON import format example


### Development Commands
```bash
npm run web      # Generate web interface template only
npm run server   # Start API server only (port 3001)
npm run cli      # Command-line interface (no web browser)
```

### Project Structure
- `web-generator.js` - Creates the web interface
- `api-server.js` - Handles API requests
- `document-generator.js` - Creates HTML documentation
- `trello-api.js` - Connects to Trello API

## 📄 License

Open source - customize and use as needed for your documentation projects.

---

**🎯 Perfect for**: Project documentation • Requirements gathering • Status reports • Team updates • Client presentations