import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BarChart3, Package, Receipt, Users, ArrowRight, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  { icon: BarChart3, title: 'Sales Tracking', desc: 'Record and monitor every sale with payment method tracking.' },
  { icon: Package, title: 'Inventory', desc: 'Real-time stock management with low-stock alerts.' },
  { icon: Receipt, title: 'Expenses', desc: 'Track every business expense by category.' },
  { icon: Users, title: 'Customers', desc: 'Manage customer relationships and purchase history.' },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 lg:px-12 h-16 border-b border-border/50">
        <h1 className="text-xl font-heading font-bold">
          <span className="text-primary">Smart</span>Biz Manager
        </h1>
        <div className="flex items-center gap-4">
          <Link to="/auth">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link to="/auth">
            <Button size="sm">Get Started <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 lg:px-12 py-20 lg:py-32 max-w-5xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Zap className="h-3.5 w-3.5" />
            Built for small businesses
          </div>
          <h1 className="text-4xl lg:text-6xl font-heading font-bold leading-tight mb-6">
            Manage your business
            <br />
            <span className="text-primary">smarter, not harder</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Track sales, inventory, expenses, and customers — all in one beautiful dashboard.
            Get insights that help you grow.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="text-base px-8">
                Start Free <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 lg:px-12 py-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
              className="glass-card rounded-xl p-6"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 lg:px-12 py-16 max-w-4xl mx-auto">
        <h2 className="text-3xl font-heading font-bold text-center mb-10">Simple Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card rounded-xl p-8">
            <h3 className="font-heading font-bold text-xl mb-2">Free</h3>
            <p className="text-3xl font-heading font-bold mb-4">$0<span className="text-base font-normal text-muted-foreground">/mo</span></p>
            <ul className="space-y-2 text-sm text-muted-foreground mb-6">
              <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Up to 50 sales records</li>
              <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Basic dashboard</li>
              <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Inventory tracking</li>
            </ul>
            <Link to="/auth"><Button variant="outline" className="w-full">Get Started</Button></Link>
          </div>
          <div className="glass-card rounded-xl p-8 border-primary/30 relative">
            <div className="absolute -top-3 left-6 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">Popular</div>
            <h3 className="font-heading font-bold text-xl mb-2">Premium</h3>
            <p className="text-3xl font-heading font-bold mb-4">$9<span className="text-base font-normal text-muted-foreground">/mo</span></p>
            <ul className="space-y-2 text-sm text-muted-foreground mb-6">
              <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Unlimited sales records</li>
              <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Advanced reports & charts</li>
              <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />AI business insights</li>
              <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Receipt generation</li>
            </ul>
            <Link to="/auth"><Button className="w-full">Upgrade Now</Button></Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-12 py-8 border-t border-border/50 text-center text-sm text-muted-foreground">
        © 2026 SmartBiz Manager. All rights reserved.
      </footer>
    </div>
  );
};

export default Index;
