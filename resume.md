# Alexander D Tsepkov

[alex@tsepkov.dev](mailto:alex@tsepkov.dev) · [github.com/atsepkov](https://github.com/atsepkov) · [linkedin.com/in/alextsepkov](https://www.linkedin.com/in/alextsepkov) · [tsepkov.dev/blog](https://tsepkov.dev/blog)

---
## Summary
- 18+ years building production software across web, mobile, IoT (3D printers), and defense (RADAR tracking)
- 2+ years hands-on AI/LLM engineering: MCP servers, multi-agent orchestration, multimodal AI pipelines, LLM API integration
- System design across distributed systems, pricing engines, analytics platforms, and real-time data pipelines
- Multiple open-source projects: compilers, scraping frameworks, LLM-powered tools, MCP servers

---
## Technical Skills
- **Languages:** TypeScript/JavaScript, Python, C/C++, Java, Swift
- **Front-end:** React, Svelte, D3, Leaflet, Webpack/Vite
- **Back-end:** Node.js, Express, Docker, Kubernetes, AWS, Azure
- **Data:** PostgreSQL, DuckDB, Redis, Kafka, Snowflake, MongoDB, Cassandra, SQLite
- **AI/LLM:** MCP Server Development, LLM API Integration (OpenAI, Anthropic, DeepSeek), Multi-Agent Orchestration, Context Engineering, Prompt Engineering, SageMaker, Claude Code, Codex
- **CI/CD & Tools:** GitHub Actions, Jenkins, Cypress, Jest

---

## AI & LLM Engineering
- **Built an [LLM-powered productivity platform](https://obsidianpl.us/) with provider-agnostic AI backend.** *Integrated DeepSeek R1 and OpenAI-compatible APIs directly into markdown notes; designed hot-swappable LLM provider layer so the AI backend switches seamlessly between cloud and local models.*
- **Built [MCP servers](https://github.com/atsepkov/obsidian-plus) integrating LLMs with external data sources.** *Obsidian MCP exposes note-taking operations to AI agents via structured tool calls. DNA MCP indexes 700k+ genetic variants for health-relevant trait analysis.*
- **Worked with [agentic orchestration patterns](https://tsepkov.dev/blog/agentic-swarms-are-we-there-yet) to improve AI reliability.** *Used adversarial agents to converge on correctness; sequential pipelines to keep each agent focused and prevent context pollution; tight context engineering to control what each agent sees.*
- **Prototyped a [GPT-4V + Puppeteer + custom state-machine scraper pipeline](/blog/teaching-llms-to-scrape-real-estate-deals) to extract structured data from unstructured sources.** *Used LLM vision to extract financial data from images with overlaid text and inconsistent formats.*
- **Published [9+ technical analyses](https://tsepkov.dev/blog) on AI-augmented software development over 2 years.** *Evaluated Claude Code, Codex, DeepSeek R1, GPT-4V, and multi-agent frameworks. Developed methodology: human-designed interfaces and tests with AI-generated implementation.*


## Professional Experience

### Xometry — Senior Engineering Manager

**Mar 2024 – Dec 2025**
Led Pricing Engine team (6 developers), maintaining several pieces of core infrastructure (cost-estimate logic, pricing logic, 3rd party plugins) while rebuilding the entirety of the pricing engine:

- Refactored legacy codebase to make feature additions and bug fixes simpler
- Unified margin adjustment logic flow for 17 processes, implemented 3 new processes (tube cutting/bending, injection molding), and integrated 5 new suppliers into the ecosystem
- Improved cost-prediction accuracy by rewriting a portion of costing logic, decreasing error as much as 50% for certain quotes
- Redesigned Pricing Engine from the ground up (new architecture) to make better use of historical + competitor data in SageMaker AI models

---
### Markforged — Principal Developer / Manager

**Mar 2020 – Dec 2023**
Led a team of 4 developers responsible for building software powering industrial-grade composite and metal printers (JavaScript/TypeScript, Python):

- Rewrote jam recovery and temperature control logic, improving print success rate and enabling faster iteration for material engineers
- Added support for 4 new materials (3 plastic composite, 1 metal) across all printer generations
- Addressed multiple long-standing UI bugs and improved user experience by re-engineering UI workflows on embedded hardware
- Rewrote legacy software (Python + AngularJS) powering 3D printers using TypeScript + Aurelia

Improved software powering the printer fleet management web portal (TypeScript/React):

- Fixed multiple severe permission bugs in RBAC logic
- Co-developed offline/LAN version of the portal
- Ported Webdriver/Selenium-based tests to Cypress
- Diagnosed and resolved production AWS infrastructure issues, reducing fleet-management portal downtime

---
### Zaius — Principal Developer (Web)

**Aug 2019 – Feb 2020**

Built real-time analytics dashboard (TypeScript, React, D3) for CRM platform; established frontend testing and deployment best practices

---
### Rakuten — Principal Developer / Mobile Tech-Lead (Mobile + Web)

**May 2015 – Aug 2019**
Coordinated development of a web-based platform for generating hybrid mobile apps (React/Redux frontend, Node + Cassandra backend, Jenkins/Jest/Docker CI/CD, React Native and Cordova mobile):

- Architected native + web components and deployment mechanism (Docker + Azure)
- Built proof-of-concept and trained a team of 4 developers
- Coordinated with teams across 3 time zones to integrate the system with mobile clients
- Designed and built internal analytics platform processing millions of events/day (Kafka ingestion, Cassandra storage, React dashboard, Java backend), serving engineering and product teams across 3 time zones

Developed Android and iOS SDKs for Rakuten marketing platform used in Singapore and Japan:

- Planned mobile architecture for iOS and Android integrating with existing backend
- Created code conventions and development cycle
- Built automated unit test framework

---
### Athenahealth — Senior Developer (Web)

**Oct 2011 – May 2015**

- Optimized SQL queries and refactored schema access; added tooling for code/schema standards
- Automated multi-datacenter practice migration and built internal developer tooling
- Designed and shipped public-facing APIs with rate limiting and OAuth authentication, supporting third-party integrations; implemented Jenkins-driven regression tests

---
### Lockheed Martin — Senior Developer / ELDP

**May 2007 – Apr 2011**

- Held U.S. DoD Secret security clearance
- Improved tracking capabilities of EQ-36 RADAR tracker system (C++) using modern signal processing, enabling prediction of rocket impact locations within a few feet over 20+ mile trajectories
- Analyzed RADAR performance in operational environment (Yuma, AZ), troubleshooting software and hardware issues on-site
- Selected for Engineering Leadership Development Program (ELDP), completing job rotations across multiple stages of the product development cycle

---
## Notable Personal & Open-Source Projects

### Obsidian-Plus
LLM-powered Obsidian plugin with MCP server, provider-agnostic AI backend, and tag-based self-organizing note system.
[obsidianpl.us](https://obsidianpl.us/) · [github.com/atsepkov/obsidian-plus](https://github.com/atsepkov/obsidian-plus)
### Investomation
Real-estate demographics and trend analysis tool with capability to track existing investments. Aggregates data from Census, FBI, IRS, Redfin, and other sources to generate estimates and predictions in real time.  
[investomation.com](https://www.investomation.com/)
### Drone
Puppeteer-based web-scraping/testing framework that builds a graph representation of websites and automates navigation, UX testing, and fault recovery using a declarative approach.  
[github.com/atsepkov/Drone](https://github.com/atsepkov/Drone)
### RapydScript
Self-hosted transpiler from a Python-like language to JavaScript with emphasis on performance. Originated as an internal tool for porting Python to JS; evolved into a standalone language with an active user base.  
[github.com/atsepkov/RapydScript](https://github.com/atsepkov/RapydScript)

---
## Education

**Cornell University**  
Master's in Systems Engineering · GPA: 3.82  
**Sep 2007 – May 2010**

**Syracuse University**  
Bachelor's in Computer Engineering · GPA: 3.712  
**Sep 2004 – May 2007**

---
## Foreign Languages
English · Russian · French
