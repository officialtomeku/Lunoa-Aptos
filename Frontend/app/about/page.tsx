"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect"
import { Footerdemo } from "@/components/ui/footer-section"
import {
  MapPin,
  Camera,
  Trophy,
  Code,
  Lock,
  Server,
  TrendingUp,
  ExternalLink,
  Target,
  Lightbulb,
  Rocket,
  Users,
  Globe,
  Zap,
  CheckCircle,
  Clock,
  ArrowRight,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const roadmapPhases = [
  {
    phase: "Phase 1",
    title: "On-Chain City Pilots",
    period: "Q1 2025",
    status: "current",
    icon: Rocket,
    description: "Launch testnet dApp with core features and pilot programs in select cities.",
    features: [
      "Testnet dApp Launch",
      "Vibe NFT Minting",
      "Interactive Discovery Map",
      "Token Faucet & Boosting",
      "Decentralized Storage Integration"
    ],
    gradient: "from-purple-500/20 via-pink-500/20 to-orange-500/20",
  },
  {
    phase: "Phase 2",
    title: "Cultural DAO Rollout",
    period: "Q2-Q3 2025",
    status: "upcoming",
    icon: Users,
    description: "Expand to multiple cities with DAO governance and advanced social features.",
    features: [
      "Multi-City Expansion",
      "DAO Governance Launch",
      "Advanced Quest System",
      "Community-Driven Content",
      "Regional Guild DAOs"
    ],
    gradient: "from-blue-500/20 via-cyan-500/20 to-teal-500/20",
  },
  {
    phase: "Phase 3",
    title: "Open Culture OS",
    period: "Q4 2025",
    status: "planned",
    icon: Globe,
    description: "Global platform with full ecosystem features and third-party integrations.",
    features: [
      "Global Platform Launch",
      "Third-Party Integrations",
      "Advanced AI Recommendations",
      "Cross-Chain Compatibility",
      "Enterprise Solutions"
    ],
    gradient: "from-green-500/20 via-emerald-500/20 to-lime-500/20",
  },
]

const teamMembers = [
  {
    name: "Java Jay Bartolome",
    role: "Founder & Chief Technology Officer (CTO)",
    description: "Visionary leader with a passion for building groundbreaking technology. Java Jay founded Tomeku with the mission to transform complex challenges into powerful solutions through innovative engineering.",
    image: "https://cdn.tomeku.com/headshots/javajay.jpg",
    icon: Code,
    gradient: "from-purple-500/20 via-pink-500/20 to-orange-500/20",
  },
  {
    name: "Marvin James Erosa",
    role: "Principal Software Engineer & Chief Information Security Officer (CISO)",
    description: "Expert in software architecture and cybersecurity, Marvin is committed to building impenetrable digital fortresses while maintaining system performance and scalability.",
    image: "https://cdn.tomeku.com/headshots/marvin.jpg",
    icon: Lock,
    gradient: "from-blue-500/20 via-cyan-500/20 to-teal-500/20",
  },
  {
    name: "Gladwin Del Rosario",
    role: "Lead Software Engineer & Head of Infrastructure",
    description: "Specialist in scalable systems and cloud architecture, Gladwin builds the backbone of modern applications that can handle massive scale and complexity.",
    image: "https://cdn.tomeku.com/headshots/gladwin.jpg",
    icon: Server,
    gradient: "from-green-500/20 via-emerald-500/20 to-lime-500/20",
  },
  {
    name: "Honeylet Igot",
    role: "Chief Marketing Officer (CMO)",
    description: "Expert at bridging the gap between complex technology and market needs, Honeylet drives growth and brand strategy while ensuring our innovations reach the right audience.",
    image: "https://cdn.tomeku.com/headshots/honey.jpg",
    icon: TrendingUp,
    gradient: "from-orange-500/20 via-red-500/20 to-pink-500/20",
  },
]



export default function About() {
  const typewriterWords = [
    {
      text: "Meet",
    },
    {
      text: "the",
    },
    {
      text: "Team",
    },
    {
      text: "Behind",
    },
    {
      text: "Lunoa",
      className: "text-purple-500 dark:text-purple-400",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 ml-8">
            <Image src="/lunoa-logo.svg" alt="Lunoa" width={120} height={120} className="w-30 h-30" />
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/platform" className="text-sm font-medium hover:text-primary transition-colors">
              Platform
            </Link>
            <Link href="/resources" className="text-sm font-medium hover:text-primary transition-colors">
              Resources
            </Link>
            <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors text-primary">
              About
            </Link>
            <Link href="/community" className="text-sm font-medium hover:text-primary transition-colors">
              Community
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="https://app.lunoa.io">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="https://app.lunoa.io/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Roadmap */}
      <section className="relative min-h-screen w-screen bg-gradient-to-br from-[#000] via-[#0A0A0A] to-[#1A2428] text-white flex flex-col items-center justify-center p-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
        <div className="w-full max-w-7xl space-y-16 relative z-10">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-8">
            <Badge
              variant="secondary"
              className="backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 px-6 py-3 rounded-full text-sm font-medium"
            >
              🚀 Lunoa Development Roadmap
            </Badge>

            <div className="space-y-6 flex items-center justify-center flex-col">
              <div className="flex items-center justify-center mb-4">
                <Image src="/lunoa-logo.svg" alt="Lunoa" width={96} height={96} className="w-24 h-24" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                Building the Future
              </h1>
              <p className="text-xl text-neutral-300 max-w-3xl text-balance leading-relaxed">
                Follow our journey as we transform everyday life into an immersive, quest-driven experience where culture is co-created and every action is rewarded.
              </p>
            </div>
          </div>

          {/* Roadmap */}
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-purple-500 via-blue-500 to-green-500 rounded-full opacity-30"></div>
            
            <div className="space-y-24">
              {roadmapPhases.map((phase, index) => {
                const isLeft = index % 2 === 0
                const StatusIcon = phase.status === 'current' ? Zap : phase.status === 'upcoming' ? Clock : CheckCircle
                
                return (
                  <div key={index} className={`flex items-center ${isLeft ? 'flex-row' : 'flex-row-reverse'} gap-8`}>
                    {/* Content Card */}
                    <div className={`w-5/12 ${isLeft ? 'text-right' : 'text-left'}`}>
                      <div className="group">
                        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-sm p-8 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 hover:scale-[1.02]">
                          <div className={`absolute inset-0 bg-gradient-to-br ${phase.gradient} opacity-30 group-hover:opacity-50 transition-opacity`} />
                          <div className="relative z-10">
                            <div className={`flex items-center gap-4 mb-6 ${isLeft ? 'justify-end' : 'justify-start'}`}>
                              <div className={`${isLeft ? 'order-2' : 'order-1'}`}>
                                <Badge 
                                  variant="secondary" 
                                  className={`px-3 py-1 text-xs font-medium ${
                                    phase.status === 'current' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                                    phase.status === 'upcoming' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                                    'bg-green-500/20 text-green-300 border-green-500/30'
                                  }`}
                                >
                                  {phase.period}
                                </Badge>
                              </div>
                              <div className={`p-3 rounded-2xl bg-white/10 border border-white/20 ${isLeft ? 'order-1' : 'order-2'}`}>
                                <phase.icon className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <h3 className="text-2xl font-bold mb-2 group-hover:text-purple-300 transition-colors">{phase.phase}</h3>
                            <h4 className="text-xl font-semibold text-purple-200 mb-4">{phase.title}</h4>
                            <p className="text-neutral-300 mb-6 leading-relaxed">{phase.description}</p>
                            <div className="space-y-2">
                              {phase.features.map((feature, featureIndex) => (
                                <div key={featureIndex} className={`flex items-center gap-3 ${isLeft ? 'justify-end' : 'justify-start'}`}>
                                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                                  <span className="text-sm text-neutral-400">{feature}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Center Timeline Node */}
                    <div className="w-2/12 flex justify-center">
                      <div className="relative">
                        <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center ${
                          phase.status === 'current' ? 'bg-purple-500 border-purple-400 shadow-lg shadow-purple-500/50' :
                          phase.status === 'upcoming' ? 'bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/50' :
                          'bg-green-500 border-green-400 shadow-lg shadow-green-500/50'
                        }`}>
                          <StatusIcon className="h-8 w-8 text-white" />
                        </div>
                        {index < roadmapPhases.length - 1 && (
                          <ArrowRight className={`absolute top-20 left-1/2 transform -translate-x-1/2 h-6 w-6 text-white/50`} />
                        )}
                      </div>
                    </div>

                    {/* Empty space for alternating layout */}
                    <div className="w-5/12"></div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center pt-16">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Button
                asChild
                className="text-sm px-8 py-3 rounded-xl bg-white text-black border border-white/10 shadow-none hover:bg-white/90 transition-all duration-300 hover:scale-105"
              >
                <Link href="https://app.lunoa.io/signup">
                  Join the Journey <Rocket className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                className="text-sm px-8 py-3 rounded-xl bg-transparent text-white border border-white/20 shadow-none hover:bg-white/10 transition-all duration-300"
              >
                <Link href="#team">Meet the Team</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet Our Core Team</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our leadership team combines decades of experience in cutting-edge technology with a shared passion for innovation and excellence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {teamMembers.map((member, index) => (
              <div key={index} className="group">
                <div className="relative overflow-hidden rounded-3xl border bg-background p-8 h-full hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                  <div className={`absolute inset-0 bg-gradient-to-br ${member.gradient} opacity-50 group-hover:opacity-70 transition-opacity`} />
                  <div className="relative z-10">
                    <div className="flex items-start space-x-6 mb-6">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg">
                          <Image 
                            src={member.image} 
                            alt={member.name}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-primary/10 border border-primary/20 backdrop-blur-sm">
                          <member.icon className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{member.name}</h3>
                        <p className="text-sm text-primary font-medium mb-3">{member.role}</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{member.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Lunoa Section */}
      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              🌟 The Vision
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Lunoa: Bridging Digital and Physical Worlds with Web3
            </h2>
            <p className="text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Lunoa is envisioned as a full-stack, decentralized discovery and commerce engine that aims to connect the digital and physical realms through user-curated real-world experiences. It operates at the intersection of Web3 Consumer (SocialFi, GameFi), Payments & Finance, and Decentralized Infrastructure (DePin).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto mb-16">
            <div className="group">
              <div className="relative overflow-hidden rounded-3xl border bg-background p-8 h-full hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 w-fit mb-6">
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 group-hover:text-primary transition-colors">Building the Operating System for Culture</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Lunoa's core vision is to become the "Operating System for Culture." In a world of fragmented digital engagement, Lunoa seeks to create a foundation where people's contributions, habits, and actions in the real world become visible, verifiable, and rewarded on-chain.
                  </p>
                </div>
              </div>
            </div>

            <div className="group">
              <div className="relative overflow-hidden rounded-3xl border bg-background p-8 h-full hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 w-fit mb-6">
                    <Lightbulb className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 group-hover:text-primary transition-colors">Quest-Driven Cultural Experience</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Transform everyday life into an immersive, quest-driven experience where culture is co-created, and every action is recorded, rewarded, and owned. Discover real-world places, mint Vibe NFTs, and earn through authentic cultural participation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="text-center p-6 rounded-2xl bg-background/50 border border-border/50 hover:bg-background transition-colors">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 w-fit mx-auto mb-4">
                <MapPin className="h-6 w-6 text-purple-500" />
              </div>
              <h4 className="font-semibold mb-2">Discover & Explore</h4>
              <p className="text-sm text-muted-foreground">Find hidden gems and cultural hotspots through personalized discovery</p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-background/50 border border-border/50 hover:bg-background transition-colors">
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 w-fit mx-auto mb-4">
                <Camera className="h-6 w-6 text-green-500" />
              </div>
              <h4 className="font-semibold mb-2">Mint Vibe NFTs</h4>
              <p className="text-sm text-muted-foreground">Transform real-world experiences into unique digital collectibles</p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-background/50 border border-border/50 hover:bg-background transition-colors">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 w-fit mx-auto mb-4">
                <Trophy className="h-6 w-6 text-blue-500" />
              </div>
              <h4 className="font-semibold mb-2">Earn Rewards</h4>
              <p className="text-sm text-muted-foreground">Get rewarded for cultural participation and community building</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Shape the Future of Culture?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Join us in building the Operating System for Culture. Transform everyday life into an immersive, quest-driven adventure where culture is co-created and every action is rewarded.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Button asChild size="lg" className="px-8">
                <Link href="https://app.lunoa.io/signup">
                  Get Started <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="px-8">
                <Link href="/resources">Read Whitepaper</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footerdemo />
    </div>
  )
}
