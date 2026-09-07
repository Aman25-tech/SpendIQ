SpendIQ is a modern, full-stack MERN application designed to help users track their daily expenses and make smarter financial decisions.

Instead of simply recording transactions, SpendIQ leverages AI to analyze spending behavior, identify financial patterns, and provide meaningful insights that help users better understand and manage their money.
## ✨ Key Features

* **Expense Tracking** – Easily add and manage daily expenses.
* **Income Management** – Track income and maintain a clear overview of finances.
* **AI-Powered Insights** – Analyze spending behavior and identify useful patterns.
* **Smart Financial Analysis** – Get insights into spending habits and monthly expenses.
* **Expense Categorization** – Organize transactions into meaningful categories.
* **Dashboard & Analytics** – View financial information in an easy-to-understand format.
* **Full-Stack Architecture** – Separate client and server applications for a scalable structure.
* **Responsive UI** – Designed to provide a smooth experience across different devices.

## 🛠️ Tech Stack

| Category           | Technology                      |
| ------------------ | ------------------------------- |
| **Frontend**       | React.js, JavaScript, HTML, CSS |
| **Backend**        | Node.js, Express.js             |
| **Database**       | MongoDB                         |
| **Architecture**   | MERN Stack                      |
| **AI Integration** | AI-powered spending analysis    |

## 📁 Project Structure

```text
SpendIQ/
│
├── client/                 # Frontend application
│   ├── src/                # React source code
│   └── public/             # Static assets
│
├── server/                 # Backend application
│   ├── controllers/        # Request handling logic
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   └── config/             # Server configuration
│
└── .gitignore
```

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

* Node.js
* npm
* MongoDB

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/Aman25-tech/SpendIQ.git
```

**2. Navigate to the project**

```bash
cd SpendIQ
```

**3. Install frontend dependencies**

```bash
cd client
npm install
```

**4. Install backend dependencies**

Open another terminal:

```bash
cd server
npm install
```

### Environment Variables

Create a `.env` file inside the server directory and configure the required environment variables.

Example:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
```

Add any AI API keys or authentication secrets used by your application.

### Run the Application

Start the backend:

```bash
cd server
npm start
```

Start the frontend:

```bash
cd client
npm start
```

The frontend and backend should then run on their configured local ports.
