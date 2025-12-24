import { ArrowLeft, Users, Target, Award, Lightbulb, Globe, Mail, MapPin, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Footer } from '@/components/landing/Footer';
import { motion } from 'framer-motion';
import { SEO } from '@/components/SEO';
import { Breadcrumbs } from '@/components/Breadcrumbs';

const teamMembers = [
  {
    name: "Alex Chen",
    role: "Founder & CEO",
    bio: "Former AI researcher at Stanford with 10+ years in machine learning and computer graphics.",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
  },
  {
    name: "Sarah Johnson",
    role: "CTO",
    bio: "Previously led engineering teams at major tech companies. Expert in distributed systems and 3D rendering.",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
  },
  {
    name: "Michael Park",
    role: "Head of AI",
    bio: "PhD in Computer Vision. Published researcher with expertise in generative models and neural networks.",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael"
  },
  {
    name: "Emma Williams",
    role: "Head of Design",
    bio: "Award-winning designer with background in 3D animation and user experience design.",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma"
  }
];

const values = [
  {
    icon: Lightbulb,
    title: "Innovation First",
    description: "We push the boundaries of what's possible with AI, constantly improving our technology to deliver cutting-edge solutions."
  },
  {
    icon: Users,
    title: "User-Centric",
    description: "Every feature we build starts with understanding our users' needs. Your success is our success."
  },
  {
    icon: Globe,
    title: "Accessible to All",
    description: "We believe powerful creative tools should be available to everyone, regardless of technical background."
  },
  {
    icon: Award,
    title: "Quality Matters",
    description: "We never compromise on quality. Our AI models are trained to produce professional-grade results."
  }
];

const milestones = [
  { year: "2022", title: "Founded", description: "VinciAI was founded with a vision to democratize 3D content creation." },
  { year: "2023", title: "Beta Launch", description: "Released our first AI-powered 3D model generator to early adopters." },
  { year: "2023", title: "1M+ Models", description: "Crossed 1 million AI-generated 3D models created by our community." },
  { year: "2024", title: "Global Expansion", description: "Expanded to serve creators in over 150 countries worldwide." },
  { year: "2024", title: "Enterprise Launch", description: "Launched enterprise solutions for studios and businesses." }
];

export default function AboutUs() {
  return (
    <>
      <SEO 
        title="About Us"
        description="Learn about VinciAI's mission to democratize AI content creation. Meet our team of AI researchers, engineers, and designers building the future of creative tools."
        keywords="VinciAI team, about VinciAI, AI company, creative AI, 3D generation company"
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border/30 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
            <Breadcrumbs />
          </div>
        </div>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              About VinciAI
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              We're on a mission to democratize 3D content creation. Our AI-powered platform enables 
              anyone to create stunning 3D models, videos, and images - no technical expertise required.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Our Mission</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-6">
                At VinciAI, we believe that creativity shouldn't be limited by technical skills. Our mission 
                is to put the power of professional 3D content creation into the hands of everyone - from 
                independent creators to enterprise teams.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Founded in 2022, we've grown from a small team of AI researchers and designers to a 
                global company serving millions of users. Our platform has generated over 10 million 
                pieces of content, and we're just getting started.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              <Card className="glass border-border/30 p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">10M+</div>
                <div className="text-sm text-muted-foreground">Models Created</div>
              </Card>
              <Card className="glass border-border/30 p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">500K+</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </Card>
              <Card className="glass border-border/30 p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">150+</div>
                <div className="text-sm text-muted-foreground">Countries</div>
              </Card>
              <Card className="glass border-border/30 p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These core principles guide everything we do at VinciAI.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass border-border/30 p-6 h-full">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 px-4 bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">Our Journey</h2>
            <p className="text-muted-foreground">Key milestones in our growth story.</p>
          </motion.div>
          <div className="space-y-6">
            {milestones.map((milestone, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-4 items-start"
              >
                <div className="flex-shrink-0 w-16 text-right">
                  <span className="text-primary font-bold">{milestone.year}</span>
                </div>
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-primary mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground">{milestone.title}</h3>
                  <p className="text-sm text-muted-foreground">{milestone.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">Meet Our Team</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We're a diverse team of AI researchers, engineers, and designers passionate about 
              making creative tools accessible to everyone.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass border-border/30 p-6 text-center">
                  <img 
                    src={member.image} 
                    alt={member.name}
                    className="w-24 h-24 rounded-full mx-auto mb-4 bg-muted"
                  />
                  <h3 className="font-semibold text-foreground">{member.name}</h3>
                  <p className="text-sm text-primary mb-2">{member.role}</p>
                  <p className="text-xs text-muted-foreground">{member.bio}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">Get in Touch</h2>
            <p className="text-muted-foreground">
              Have questions? We'd love to hear from you.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="glass border-border/30 p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Email</h3>
              <a href="mailto:hello@vinciai.com" className="text-sm text-primary hover:underline">
                hello@vinciai.com
              </a>
            </Card>
            <Card className="glass border-border/30 p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Location</h3>
              <p className="text-sm text-muted-foreground">
                San Francisco, CA<br />United States
              </p>
            </Card>
            <Card className="glass border-border/30 p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Support</h3>
              <Link to="/contact" className="text-sm text-primary hover:underline">
                Contact Support
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-primary/20 via-secondary/10 to-accent/20 rounded-3xl p-12 border border-border/30"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Start Creating?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join millions of creators using VinciAI to bring their ideas to life.
            </p>
            <Link to="/create">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Sparkles className="mr-2 h-5 w-5" />
                Get Started for Free
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
    </>
  );
}
