import API_URL from "./api";
import { useState } from "react";
import { useToast } from "./context/ToastContext";

function LeadForm() {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({
    type: "",
    text: "",
  });

  
async function handleSubmit(event) {
  event.preventDefault();

  if (isSubmitting) return;

  const form = event.currentTarget;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  // حذف الحقول الاختيارية الفارغة
  if (!payload.company?.trim()) delete payload.company;
  if (!payload.budget) delete payload.budget;

  setIsSubmitting(true);
  setFeedback({ type: "", text: "" });

  try {
    const response = await fetch(`${API_URL}/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    
    

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to send your request. Please try again."
      );
    }

    setFeedback({
      type: "success",
      text: "Your request was sent successfully! We will contact you soon.",
    });

    showToast("Your request was sent successfully!", "success");
    form.reset();

  } catch (error) {
    console.error("Lead submission error:", error);

    setFeedback({
      type: "error",
      text: error.message || "Unable to connect to the server.",
    });

    showToast(
      error.message || "Unable to connect to the server.",
      "error"
    );

  } finally {
    setIsSubmitting(false);
  }
}


  return (
    <section className="contact section" id="contact">
      <p className="eyebrow">LET'S TALK</p>

      <h2>Have a project in mind?</h2>

      <p>
        Tell us what you need, and let's build something great.
      </p>

      <form className="lead-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Enter your full name"
            minLength={7}
            maxLength={100}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
  type="tel"
  id="phone"
  name="phone"
  placeholder="Enter your phone number"
  pattern="[0-9+\-\s()]{8,20}"
  title="Enter a valid phone number (8–12 characters)"
  minLength={8}
  maxLength={12}
  required
/>
        </div>

        <div className="form-group">
          <label htmlFor="company">Company Name</label>
          <input
            type="text"
            id="company"
            name="company"
            placeholder="Your company (optional)"
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label htmlFor="service">Service Required</label>
          <select
            id="service"
            name="service"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Select a service
            </option>
            <option value="Web Development">Web Development</option>
            <option value="Mobile App">Mobile App</option>
            <option value="E-Commerce">E-Commerce</option>
            <option value="UI/UX Design">UI/UX Design</option>
            <option value="Digital Marketing">Digital Marketing</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="budget">Estimated Budget</label>
          <select
            id="budget"
            name="budget"
            defaultValue=""
          >
            <option value="">
              Select your budget (optional)
            </option>
            <option value="Less than 10,000">Less than 10,000</option>
            <option value="10,000 - 25,000">10,000 - 25,000</option>
            <option value="25,000 - 50,000">25,000 - 50,000</option>
            <option value="50,000+">50,000+</option>
            <option value="Not Sure">Not Sure</option>
          </select>
        </div>

        <div className="form-group full-width">
          <label htmlFor="message">Project Details</label>
          <textarea
            id="message"
            name="message"
            rows="5"
            placeholder="Tell us about your project..."
            minLength={10}
            maxLength={1000}
            required
          />
        </div>

        {feedback.text && (
          <p
            className={`form-feedback ${feedback.type}`}
            role="status"
            aria-live="polite"
          >
            {feedback.text}
          </p>
        )}

        <button
          type="submit"
          className="primary-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending..." : "Send Request"}
        </button>
      </form>
    </section>
  );
}

export default LeadForm;
