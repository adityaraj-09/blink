# Ionix Landing Page

A stunning, feature-rich landing page for a GitHub-based coding platform built with React, Vite, Tailwind CSS v4, WebGL effects, and Clerk authentication with dark theme.

## 🎨 Design Features

- **Color Scheme**:
  - Primary Blue: `#365eff`
  - Secondary Blue: `#4d70ff`
  - Background: `#000000` (Black)
- **Typography**: Space Grotesk font family
- **Framework**: Tailwind CSS v4
- **Icons**: Lucide React
- **Authentication**: Clerk

## 🚀 Features

### Landing Page Sections
1. **Hero Section** - Eye-catching hero with animated background and stats
2. **Features Section** - 10 detailed features with icons and descriptions
3. **How It Works** - 4-step process with visual flow
4. **Testimonials** - Customer reviews and trust badges
5. **CTA Section** - Call-to-action with trial offer
6. **Footer** - Comprehensive footer with links and newsletter

### Pricing Page
- 3 pricing tiers (Free, Pro, Enterprise)
- Feature comparison
- FAQ section
- Billing toggle (Monthly/Annual)

### Additional Features
- Responsive design for all screen sizes
- Smooth animations and transitions
- Dark theme with gradient effects
- Clerk authentication integration
- React Router for navigation

## 📦 Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd landing-page
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
```

To get your Clerk publishable key:
- Sign up at [clerk.com](https://clerk.com)
- Create a new application
- Copy your publishable key from the dashboard
- Paste it in the `.env` file

4. **Run the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🛠️ Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist` directory.

## 📁 Project Structure

```
landing-page/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          # Navigation bar with Clerk auth
│   │   ├── Hero.jsx             # Hero section
│   │   ├── Features.jsx         # Features showcase
│   │   ├── HowItWorks.jsx       # Process explanation
│   │   ├── Testimonials.jsx     # Customer testimonials
│   │   ├── CTA.jsx              # Call-to-action section
│   │   └── Footer.jsx           # Footer with links
│   ├── pages/
│   │   ├── LandingPage.jsx      # Main landing page
│   │   └── PricingPage.jsx      # Pricing page
│   ├── App.jsx                  # Main app with routing
│   ├── main.jsx                 # Entry point
│   └── index.css                # Tailwind CSS imports
├── .env                         # Environment variables
├── .env.example                 # Example environment file
├── tailwind.config.js           # Tailwind configuration
├── vite.config.js               # Vite configuration
└── package.json                 # Dependencies
```

## 🎯 Key Technologies

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **Clerk** - Authentication and user management
- **Lucide React** - Icon library
- **Space Grotesk** - Google Font

## 🎨 Customization

### Colors
Edit `tailwind.config.js` to change the color scheme:
```javascript
colors: {
  primary: '#365eff',    // Change primary color
  secondary: '#4d70ff',  // Change secondary color
}
```

### Font
Edit `tailwind.config.js` to change the font:
```javascript
fontFamily: {
  sans: ['Your Font', 'sans-serif'],
}
```

Update the Google Fonts import in `src/index.css`.

### Content
- **Hero Section**: Edit `src/components/Hero.jsx`
- **Features**: Modify the features array in `src/components/Features.jsx`
- **Pricing**: Update pricing tiers in `src/pages/PricingPage.jsx`
- **Testimonials**: Edit testimonials array in `src/components/Testimonials.jsx`

## 🔐 Clerk Authentication Setup

1. Sign up at [clerk.com](https://clerk.com)
2. Create a new application
3. Choose your preferred authentication methods (Email, Google, GitHub, etc.)
4. Copy your publishable key
5. Add it to your `.env` file
6. The authentication is already integrated in:
   - Navbar (Sign In/User Button)
   - Hero (CTA buttons)
   - Pricing Page (CTA buttons)

## 📱 Responsive Design

The landing page is fully responsive with breakpoints:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## 🚢 Deployment

### Vercel
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload the 'dist' folder to Netlify
```

### Other Platforms
Build the project and deploy the `dist` folder to any static hosting service.

## 📄 License

MIT License - feel free to use this for your own projects!

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 💡 Support

For support, email your-email@example.com or open an issue in the repository.

---

Built with ❤️ using React, Vite, and Tailwind CSS v4
