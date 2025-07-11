# Summer Sprout Budget Features

This document outlines the key features of the Summer Sprout Budget application.

## Core Features

- **Interactive Calendar Interface**: A user-friendly calendar interface with tabs for June, July, August, and September.
- **Editable Spending and Income**: Users can easily input their daily/weekly spendings and monthly income into an editable table.
- **Real-time Balance Calculation**: The remaining balance is automatically calculated and updated in real-time as spendings or income are entered.
- **Automated Calculations**: All financial calculations are performed automatically for a seamless user experience.
- **Data Visualization**: The application likely includes charts or other visual elements to represent budget data, as suggested by the presence of a `chart.tsx` component.

## Authentication

- **User Signup and Login**: Users can create an account and log in to manage their personal budgets.
- **Secure Authentication**: Firebase Authentication is used to ensure secure user access.

## Collaboration

- **Shared Budget Rooms**: Users can create shared budget rooms to collaborate with others in real-time.
- **Room Codes**: Each shared room has a unique, joinable code (e.g., `ABC-123`).
- **Personal and Shared Modes**: Users can switch between their personal budget and any shared rooms they are a part of.

## Technical Stack

- **Frontend**: Next.js, React, TypeScript
- **Backend**: Firebase (Authentication, Firestore)
- **Styling**: Tailwind CSS, shadcn/ui 

## Style Guidelines:

- Primary color: Vibrant green (#A0D6B4), reminiscent of budding leaves, symbolizes growth and new beginnings.
- Background color: Light green (#E5F0E7), very desaturated, ensuring the UI is soft and pleasing.
- Accent color: Yellow (#D4AC0D), contrasting beautifully with the analogous green shades and providing highlights.
- Body and headline font: 'PT Sans', a humanist sans-serif for readability and a modern look.
- Use line icons for income and spendings. When providing tips, the icon should feature a lightbulb.
- Calendar interface is responsive, scaling to mobile, tablet, and desktop resolutions. A card like style shall be applied on all screens
- Gentle transition effects when navigating months or entering data.