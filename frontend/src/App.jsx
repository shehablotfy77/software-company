
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import "./App.css";
import LeadForm from "./LeadForm";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import { ToastProvider } from "./context/ToastContext";




// Social links
const socialLinks = [
  {
    name: "WhatsApp",
    url: "https://wa.me/201157016608",
    icon: "WA",
  },
  {
    name: "GitHub",
    url: "https://github.com/shehablotfy77",
    icon: "GH",
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/in/shehab-lotfy-23ba0a238/",
    icon: "IN",
  },
];

// Services
const services = [
  {
    number: "01",
    icon: "</>",
    title: "Web Development",
    description:
      "Modern, responsive websites built around your business goals.",
  },
  {
    number: "02",
    icon: "▯",
    title: "Mobile Applications",
    description:
      "Useful mobile experiences for Android and iOS platforms.",
  },
  {
    number: "03",
    icon: "✳",
    title: "UI/UX Design",
    description:
      "Clear and attractive interfaces designed around real users.",
  },
  {
    number: "04",
    icon: "◇",
    title: "E-Commerce",
    description:
      "Online stores that make shopping simple and effective.",
  },
  {
    number: "05",
    icon: "↗",
    title: "Digital Marketing",
    description:
      "Digital strategies to help your brand reach more people.",
  },
  {
    number: "06",
    icon: "⚙",
    title: "Custom Software",
    description:
      "Software solutions tailored to your workflow and needs.",
  },
];

// Portfolio examples – replace with real company projects
const projects = [
  {
    number: "01",
    category: "Full Stack Development",
    title: "SoftCompany Website",
    description: "A software company website with a client request form and admin dashboard.",
    image: "/images/SoftCompany preview.png",
    tags: ["React", "Node.js", "Express", "MongoDB"],
    url: "/",
    github: "",
  },
  {
    number: "02",
    category: "Frontend Development",
    title: "Personal Website",
    description: "A personal website built to showcase profile, skills, and projects.",
    image: "/images/personal-website-preview.png",
    tags: ["HTML", "CSS"],
    url: "/projects/personal-website/index.html",
    github: "",
  },
  {
    number: "03",
    category: "JavaScript Application",
    title: "CRUD Management System",
    description: "A data management application with create, read, update, and delete features.",
    image: "/images/crud-project-preview.png",
    tags: ["HTML", "CSS", "JavaScript", "Local Storage"],
    url: "/projects/crud-project/index.html",
    github: "",
  },
];

// Team roles – add real team members when available
const team = [
  {
    initials: "WD",
    role: "Web Development",
    description: "Building reliable and responsive web solutions.",
  },
  {
    initials: "UI",
    role: "UI/UX Design",
    description: "Creating useful and intuitive digital experiences.",
  },
  {
    initials: "DM",
    role: "Digital Marketing",
    description: "Helping businesses connect with their audience.",
  },
];

// Pricing packages – custom quotes, no invented prices
const pricingPlans = [
  {
    name: "Starter",
    description: "For individuals and small businesses.",
    features: [
      "Professional website",
      "Responsive design",
      "Basic contact form",
      "Essential support",
    ],
  },
  {
    name: "Business",
    featured: true,
    description: "For growing businesses.",
    features: [
      "Everything in Starter",
      "Advanced website features",
      "Custom UI/UX design",
      "Admin dashboard options",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    description: "For custom business requirements.",
    features: [
      "Custom software solutions",
      "Advanced integrations",
      "Scalable architecture",
      "Dedicated project planning",
    ],
  },
];

function BrandLogo() {
  return (
    <a href="#home" className="logo" aria-label="SoftCompany home">
      <svg
        className="brand-mark"
        viewBox="0 0 48 48"
        role="img"
        aria-label="SoftCompany logo"
      >
        <defs>
          <linearGradient id="brand-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#62c5ff" />
            <stop offset="100%" stopColor="#2472f5" />
          </linearGradient>
        </defs>

        <path
          d="M7 5 L29 17 L19 24 L7 5Z"
          fill="url(#brand-gradient)"
        />
        <path
          d="M7 5 L7 43 L19 31 L19 24 L29 17 L41 24 L19 39 L7 43 L29 27 L41 24 L29 17Z"
          fill="url(#brand-gradient)"
        />
        <path
          d="M19 24 L29 17 L41 24 L29 31Z"
          fill="#8bd8ff"
          opacity="0.9"
        />
      </svg>

      <span className="logo-name">
        Soft<span>Company</span>
      </span>
    </a>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {description && <p className="section-description">{description}</p>}
    </div>
  );
}

function HomePage() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("softcompany-theme") || "dark";
    } catch {
      return "dark";
    }
  });

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("softcompany-theme", theme);
    } catch {
      // The site works if browser storage is unavailable.
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((current) =>
      current === "dark" ? "light" : "dark"
    );
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="app" data-theme={theme}>
      {/* Navigation */}
      <nav className="navbar">
        <BrandLogo />

        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <div className={`nav-links ${menuOpen ? "active" : ""}`}>
          <a href="#home" onClick={closeMenu}>Home</a>
          <a href="#about" onClick={closeMenu}>About</a>
          <a href="#services" onClick={closeMenu}>Services</a>
          <a href="#projects" onClick={closeMenu}>Projects</a>
          <a href="#team" onClick={closeMenu}>Team</a>
          <a href="#contact" className="nav-button" onClick={closeMenu}>
            Contact Us
          </a>
        </div>

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          <span aria-hidden="true">
            {theme === "dark" ? "☀" : "☾"}
          </span>
          <span className="theme-label">
            {theme === "dark" ? "Light" : "Dark"}
          </span>
        </button>
      </nav>

      <main>
        {/* Hero */}
        <section className="hero" id="home">
          <div className="hero-content">
            <p className="eyebrow">YOUR DIGITAL PARTNER</p>

            <h1>
              We Build Digital
              <span> Experiences That Matter.</span>
            </h1>

            <p className="hero-description">
              We help ambitious businesses grow with modern websites,
              mobile applications, and smart software solutions.
            </p>

            <div className="hero-actions">
              <a href="#contact" className="primary-button">
                Start Your Project <span>↗</span>
              </a>

              <a href="#services" className="secondary-button">
                Explore Services
              </a>
            </div>

            <div className="hero-trust">
              <span className="trust-dot" />
              Thoughtful design. Reliable technology.
            </div>
          </div>

          <div className="hero-card">
            <div className="card-icon">{"</>"}</div>
            <p>Ideas into reality.</p>
            <h2>Build. Create. Grow.</h2>
            <div className="card-line" />
            <p className="card-caption">
              Technology designed around your business.
            </p>
            <div className="card-decoration" aria-hidden="true">
              {"{ }"}
            </div>
          </div>
        </section>

        {/* About */}
        <section className="about section" id="about">
          <SectionHeading
            eyebrow="WHO WE ARE"
            title="Technology that moves your business forward."
            description="We combine creative thinking and reliable technology to turn ideas into practical digital products."
          />

          <div className="about-grid">
            <article className="about-card">
              <span>01</span>
              <h3>Understand</h3>
              <p>We start by understanding your goals and business needs.</p>
            </article>

            <article className="about-card">
              <span>02</span>
              <h3>Build</h3>
              <p>We turn your requirements into practical digital solutions.</p>
            </article>

            <article className="about-card">
              <span>03</span>
              <h3>Improve</h3>
              <p>We focus on quality, usability, and continuous improvement.</p>
            </article>
          </div>
        </section>

        {/* Services */}
        <section className="services section" id="services">
          <SectionHeading
            eyebrow="WHAT WE DO"
            title="Our Services"
            description="Digital solutions built around your goals, your customers, and the next stage of your business."
          />

          <div className="service-grid">
            {services.map((service) => (
              <article className="service-card" key={service.number}>
                <span className="service-number">{service.number}</span>
                <div className="service-icon">{service.icon}</div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Projects Portfolio */}
        <section className="projects section" id="projects">
          <SectionHeading
            eyebrow="OUR WORK"
            title="Selected Projects"
            description="Explore examples of the digital experiences and solutions we aim to create."
          />

          <div className="projects-grid">
            {projects.map((project) => (
              <a
                className="project-card"
                key={project.number}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="project-visual">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="project-image"
                  />
                </div>

                <div className="project-info">
                  <p className="project-category">{project.category}</p>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>

                  <div className="project-tags">
                    {project.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>

                  <div className="project-actions">
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="project-btn live-demo-btn"
                    >
                      <i className="bi bi-eye"></i>
                      Live Demo
                    </a>

                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="project-btn source-code-btn"
                      >
                        <i className="bi bi-github"></i>
                        Source Code
                      </a>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
          <p className="content-note">
            Portfolio examples are illustrative. Replace them with completed company projects before publishing.
          </p>
        </section>

        {/* Why Us */}
        <section className="why-us section">
          <SectionHeading
            eyebrow="WHY CHOOSE US"
            title="A thoughtful approach to every project."
            description="We focus on clear communication, practical solutions, and experiences that serve real business needs."
          />

          <div className="why-grid">
            <div className="why-item">
              <span>✦</span>
              <h3>Clear Communication</h3>
              <p>Understandable steps and transparent project discussions.</p>
            </div>

            <div className="why-item">
              <span>⌘</span>
              <h3>Modern Technology</h3>
              <p>Technology choices that fit the project requirements.</p>
            </div>

            <div className="why-item">
              <span>✓</span>
              <h3>Quality Focus</h3>
              <p>Careful attention to usability, performance, and details.</p>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="team section" id="team">
          <SectionHeading
            eyebrow="OUR TEAM"
            title="People behind the solutions."
            description="Different areas of expertise working toward one goal: useful digital products."
          />

          <div className="team-grid">
            {team.map((member) => (
              <article className="team-card" key={member.role}>
                <div className="team-avatar">{member.initials}</div>
                <h3>{member.role}</h3>
                <p>{member.description}</p>
              </article>
            ))}
          </div>
          <p className="content-note">
            These cards describe team roles, not individual staff profiles.
          </p>
        </section>

        {/* Testimonials */}
        <section className="testimonials section" id="testimonials">
          <SectionHeading
            eyebrow="CLIENT EXPERIENCE"
            title="Built around client needs."
            description="We believe a successful project starts with listening and clear expectations."
          />

          <div className="testimonial-card">
            <span className="quote-mark">“</span>
            <h3>Your experience matters.</h3>
            <p>
              This section is ready for genuine client feedback.
              Add approved testimonials here when they are available.
            </p>
            <span className="testimonial-caption">
              Real feedback from real clients
            </span>
          </div>
        </section>

        {/* Pricing */}
        <section className="pricing section" id="pricing">
          <SectionHeading
            eyebrow="OUR PACKAGES"
            title="Flexible solutions for every stage."
            description="Choose a starting point. Every project can be tailored to your actual requirements."
          />

          <div className="pricing-grid">
            {pricingPlans.map((plan) => (
              <article
                className={`pricing-card ${plan.featured ? "featured" : ""}`}
                key={plan.name}
              >
                {plan.featured && (
                  <span className="pricing-badge">Popular choice</span>
                )}

                <h3>{plan.name}</h3>
                <p>{plan.description}</p>

                <div className="pricing-value">Custom Quote</div>

                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <span>✓</span> {feature}
                    </li>
                  ))}
                </ul>

                <a
                  href="#contact"
                  className={plan.featured ? "primary-button" : "secondary-button"}
                >
                  Discuss Your Project ↗
                </a>
              </article>
            ))}
          </div>
        </section>

        {/* Contact Form */}
        <section id="contact" className="contact-section">
          <SectionHeading
            eyebrow="LET'S WORK TOGETHER"
            title="Have a project in mind?"
            description="Tell us about your idea and let's discuss how we can bring it to life."
          />
          <LeadForm />
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <BrandLogo />
            <p>
              Building better digital experiences.
              Turning ideas into practical digital solutions.
            </p>
          </div>

          <div className="footer-navigation">
            <h3>Quick Links</h3>
            <a href="#about">About</a>
            <a href="#services">Services</a>
            <a href="#projects">Projects</a>
            <a href="#pricing">Pricing</a>
            <a href="#contact">Contact</a>
          </div>

          <div className="footer-social">
            <h3>Connect With Us</h3>

            <div className="social-links">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                  aria-label={social.name}
                  title={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} SoftCompany. All rights reserved.
          </p>
          <p>Designed & Developed with passion.</p>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a
        href="https://wa.me/201157016608"
        className="whatsapp-float"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contact us on WhatsApp"
        title="Chat on WhatsApp"
      >
        WA
      </a>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const token = sessionStorage.getItem("adminToken");
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
