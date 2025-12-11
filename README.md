# LogStreamPro

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.1.6.

# 🛡️ LogStream Pro - Enterprise Log Management System

A real-time, secure, and scalable log management dashboard designed for enterprise monitoring. Built with the **M.E.A.N Stack (MongoDB, Express, Angular, Node)** + **GraphQL**.

🔗 **Live Demo:** [Link to your Vercel App Here]
backend-api: [Link to Render API]

---

## 🚀 Key Features

### 🔐 Security First
- **HttpOnly Cookies:** JWT tokens are stored securely in cookies (not localStorage) to prevent XSS attacks.
- **RBAC (Role-Based Access Control):** Admin vs User roles with protected mutations (Delete/Edit).
- **Secure Transport:** HTTPS & WSS (Secure WebSockets) enabled.

### ⚡ Real-Time Performance
- **Live Updates:** GraphQL Subscriptions ensure logs appear instantly without refreshing.
- **Virtual Scrolling:** Angular CDK allows rendering 10,000+ logs smoothly without DOM lag.
- **Reactive State:** Powered by **Angular Signals** for granular and high-performance UI updates.

### 📊 Analytics & Insights
- **Data Visualization:** Interactive Charts (Doughnut & Summary Cards) for error trends.
- **Advanced Filtering:** Server-side search (Regex) + Time Travel (Date Range Filtering).
- **Aggregation:** MongoDB Aggregation pipelines for calculating stats on the fly.

---

## 🛠️ Tech Stack

- **Frontend:** Angular 20.1.6, TailwindCSS, Apollo Client, Spartan-NG (UI), Chart.js.
- **Backend:** Node.js, Express, Apollo Server (GraphQL), Mongoose.
- **Database:** MongoDB Atlas (Cloud).
- **DevOps:** Docker, Docker Compose, Render (Backend), Vercel (Frontend).

---

## 🐳 How to Run Locally (Docker)

1. **Clone the repo**
   ```bash
   git clone [https://github.com/your-username/log-stream-pro.git](https://github.com/your-username/log-stream-pro.git)
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
