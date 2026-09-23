# Google Apps Script Email Notification Web App Deployment Guide

This applet uses Google Apps Script (MailApp) to deliver email notifications directly to **globalherbsinc@gmail.com** for:
1. **Customer Orders** (Checkout submissions with products, totals, customer details & shipping address)
2. **Customer Contact Inquiries** (General contact form submissions with customer question, phone & direct Reply-To)
3. **Account & Member Inquiries** (Portal registrations and inquiries)
4. **Product Reviews** (Customer review submissions with star ratings and product feedback)
5. **Newsletter & VIP Subscriptions** (New subscribers & waitlist leads)

When an email arrives in `globalherbsinc@gmail.com`, hitting **Reply** in Gmail responds directly to the customer's email address.

---

## 1-Minute Deployment Steps

1. Go to **[script.google.com](https://script.google.com/)** and sign in with the admin Google Account (`globalherbsinc@gmail.com` or your preferred account).
2. Click **New Project** (top-left).
3. Name the project: `Global Herbs Email Notifications`.
4. In the code editor, delete any existing code in `Code.gs`.
5. Copy all code from `/google-apps-script/Code.gs` in this repository and paste it into the editor.
6. Click the **Save** icon (diskette).
7. (Optional) Run the `testCustomerInquiryNotification()` or `testOrderNotification()` function directly in the editor to verify delivery to your inbox and authorize permissions.
8. Click **Deploy** (top-right blue button) > **New deployment**.
9. In the modal, click the **Gear icon (Select type)** and select **Web app**.
10. Configure:
    - **Description**: `Global Herbs Mail Dispatcher v2`
    - **Execute as**: **Me (`your-email@gmail.com`)**
    - **Who has access**: **Anyone** *(Crucial: This allows the backend server to POST payloads to the endpoint without OAuth)*
11. Click **Deploy**.
12. Click **Authorize access**, select your Google account, click **Advanced**, and click **Go to Global Herbs Email Notifications (unsafe)** to grant Mail permissions.
13. Copy the **Web App URL** (looks like `https://script.google.com/macros/s/AKfycb.../exec`).
14. Paste this Web App URL into your environment variable:
    - In AI Studio: Open **Settings** > Environment Variables > set `GOOGLE_APPS_SCRIPT_URL` to your Web App URL.

---

## How It Works

- **Direct Reply-To**: Every notification sets the customer's submitted email as `replyTo`.
- **Non-Blocking Reliability**: If Google Apps Script is momentarily unreachable or cold-starting, the customer's checkout, contact form, or review submission **never fails**.
- **Self-Healing Templates**: Inquiries automatically use the Customer Support / Contact Desk layout, while orders use the Order Desk invoice layout.
