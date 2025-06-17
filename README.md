# 🤖 AI WhatsApp Agent

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node.js](https://img.shields.io/badge/Node.js-v14+-yellow.svg)
![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)

</div>

## 📝 Overview

An intelligent WhatsApp-like AI agent designed for automated lead qualification. This system leverages advanced natural language processing and machine learning to provide a seamless, conversational experience for qualifying potential leads.

## ✨ Features

- 💬 Interactive WhatsApp-style chat interface
- 🧠 AI-powered lead qualification
- 🔍 Natural language understanding
- ⚡ Real-time conversation processing
- 📊 Automated lead scoring and categorization
- 🔄 Seamless integration capabilities

## 🚀 Quick Start

### Prerequisites

- Node.js (v14.0.0 or higher)
- npm (Node Package Manager)
- Python 3.8 or higher
- Git

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/chiranjeevic13/Whatsapp_AI_agent.git
   cd AI_Whatsapp_agent
   ```

2. **Install Node.js Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Python Environment**
   ```bash
   # Create virtual environment
   python -m venv venv

   # Activate virtual environment
   # For Windows
   venv\Scripts\activate
   # For Unix/MacOS
   source venv/bin/activate
   ```

4. **Configure Environment**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   NODE_ENV=development
   ```

## 📁 Project Structure

```
AI_Whatsapp_agent/
├── 📂 app.js              # Main application file
├── 📂 config/            # Configuration files
├── 📂 data/              # Data storage
├── 📂 public/            # Static files
├── 📂 src/               # Source code
├── 📄 model.nlp          # NLP model file
└── 📄 package.json       # Project dependencies
```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The application will be available at `http://localhost:3000`

## 📦 Dependencies

### Core Dependencies
| Package | Purpose |
|---------|---------|
| express | Web framework |
| socket.io | Real-time communication |
| @langchain/core | AI/ML framework |
| @langchain/community | Community AI models |
| node-nlp | Natural language processing |
| dotenv | Environment configuration |
| uuid | Unique identifier generation |
| moment | Date/time handling |

### Development Dependencies
- nodemon: Development server with auto-reload

## 🎯 Usage Guide

1. **Start the Application**
   ```bash
   npm run dev
   ```

2. **Access the Interface**
   - Open your web browser
   - Navigate to `http://localhost:3000`

3. **Begin Interaction**
   - Start chatting with the AI agent
   - The system will automatically qualify leads
   - View real-time scoring and categorization

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 💬 Support

- 📧 Email: chiruc1305@gmail.com
- 💻 GitHub Issues: [Create an issue](https://github.com/chiranjeevic13/Whatsapp_AI_agent/issues)

---

<div align="center">
Made with ❤️ by CHiranjeevi C
</div>
