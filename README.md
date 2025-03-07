# Swarm Social App

This is the codebase for Swarm, a fork of Bluesky, that leverages a feeless blockchain (Koinos) to reward meaningful contributions. Swarm will be the first application to leverage "proof of value"; a social consensus algorithm. Proof of value adds frictionless and intuitive incentive alignment which turns any group of people into a more goal-oriented meta-group or "swarm." 

## Development Resources

This is a [React Native](https://reactnative.dev/) application, written in the TypeScript programming language. It builds on the `atproto` TypeScript packages (like [`@atproto/api`](https://www.npmjs.com/package/@atproto/api)), code for which is also open source, but in [a different git repository](https://github.com/bluesky-social/atproto).

There is a small amount of Go language source code (in `./bskyweb/`), for a web service that returns the React Native Web application.

The [Build Instructions](./docs/build.md) are a good place to get started with the app itself.

### Deployment

For deploying the application to production environments:

- [Render Deployment Guide](./docs/render-deployment.md) - Instructions for deploying to Render cloud platform

### Architecture Documentation

For a high-level overview of the Swarm Community Platform architecture, implementation status, and development roadmap, see the [Technical Architecture & Implementation Plan](.cursor/architecture/swarm-technical-architecture.md).

The Authenticated Transfer Protocol ("AT Protocol" or "atproto") is a decentralized social media protocol. You don't *need* to understand AT Protocol to work with this application, but it can help. Learn more at:

- [Overview and Guides](https://atproto.com/guides/overview)
- [Github Discussions](https://github.com/bluesky-social/atproto/discussions) 👈 Great place to ask questions
- [Protocol Specifications](https://atproto.com/specs/atp)
- [Blogpost on self-authenticating data structures](https://bsky.social/about/blog/3-6-2022-a-self-authenticating-social-protocol)

The Swarm social application encompasses a set of schemas and APIs built in the overall AT Protocol framework. The namespace for these "Lexicons" is `app.bsky.*`.

## Are you a developer interested in building on atproto?

Swarm is an open social network built on the AT Protocol, a flexible technology that will never lock developers out of the ecosystems that they help build. With atproto, third-party integration can be as seamless as first-party through custom feeds, federated services, clients, and more.

## License (MIT)

See [./LICENSE](./LICENSE) for the full license.
