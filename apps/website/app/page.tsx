import { Button, Container, Logo } from "@truelend/ui";

// Temporary page proving the design-system wiring; replaced by the real home.
export default function Home() {
  return (
    <Container className="flex min-h-screen flex-col items-start justify-center gap-8 py-24">
      <Logo tagline />
      <h1 className="font-display text-5xl font-extrabold tracking-tight">
        We help you choose the right loan.
        <br />
        <span className="text-red-600">From the right lender.</span>
      </h1>
      <div className="flex gap-3">
        <Button>Speak to an Advisor</Button>
        <Button variant="secondary">Schedule a Consultation</Button>
      </div>
    </Container>
  );
}
