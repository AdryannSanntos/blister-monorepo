# Graph Report - api  (2026-07-11)

## Corpus Check
- 354 files · ~121,581 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2425 nodes · 5155 edges · 165 communities (99 shown, 66 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4ccb9b07`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cuts-steps.ts
- cuts-render-clip.ts
- company.service.ts
- RolesService
- index.ts
- root.tsx
- agents.module.ts
- AgentSseService
- PrismaService
- AgentRunService
- carousel-run-deps.ts
- session.service.ts
- StorageService
- CreditService
- text-image
- MarketplaceService
- .write
- scripts
- FilesService
- normalize-slide-copy.util.ts
- text
- text-image
- text
- text
- text
- ai-catalog.controller.ts
- CarouselTemplateService
- agent-run-execute.ts
- AiCatalogController
- agents-credits.e2e-spec.ts
- generate-slides.step.ts
- manifest.json
- prisma.service.ts
- PoliciesService
- agent-loader.ts
- FilesController
- ProjectsService
- admin.controller.ts
- slide-template-engine.ts
- design-plan-normalizer.ts
- app.controller.ts
- seed.ts
- generate-content.step.ts
- validate-carousel-templates.ts
- Slide library
- validate-template-previews.ts
- preview-samples.ts
- agent-execution.kernel.ts
- .resolveFromRequest
- Slide library
- index.ts
- exclude
- compilerOptions
- carousel-ai-edit.service.ts
- seed-ai-catalog.ts
- slides-generation-context.ts
- personal-space.controller.ts
- validate-template-shell.ts
- .error
- Reel — Template Instructions
- validate-visual-all.ts
- getCarouselRunDeps
- Daylight — Template Instructions
- Spotlight — Template Instructions
- Voltage — Template Instructions
- provider-error-message.ts
- dependencies
- jest
- hydrate-slides.ts
- AgentCatalogController
- ModelsService
- WorkspaceSettingsService
- AgentRegistryService
- register-better-auth.ts
- WorkspaceSettingsController
- assert-sse-events.ts
- Content Machine — Template Instructions
- brand-theme.util.ts
- content-slides-normalizer.ts
- README.md
- tsconfig.trigger.json
- PlatformSettingsService
- SseEventCollector
- biome.json
- devDependencies
- .exportRun
- package.json
- serve-template-gallery.ts
- AppModule
- rag-index-document.ts
- run-event.publisher.ts
- nest-cli.json
- carousel-templates.controller.ts
- plain-text.util.ts
- agent-skills.loader.ts
- ProvidersService
- agent-run.fixture.ts
- generate-ideas.step.ts
- assert-credit-ledger.ts
- AdminGuard
- CutsRunDepsAdapter
- dedupeCarouselSlidesById
- @prisma/client
- object-storage.util.ts
- @aws-sdk/lib-storage
- better-auth
- @better-auth/utils
- @company-os/agent-ia-sdk
- @company-os/authz
- @company-os/db
- @company-os/types
- concurrently
- cookie-parser
- docker-entrypoint.sh
- docker-seed.sh
- ffmpeg-static
- import-in-the-middle
- jest
- multer
- @nestjs/cli
- @nestjs/common
- @nestjs/config
- @nestjs/core
- @nestjs/platform-express
- @nestjs/schematics
- @nestjs/testing
- @openrouter/agent
- @openrouter/sdk
- pdf-parse
- puppeteer
- react-dom
- reflect-metadata
- remotion
- @remotion/bundler
- @remotion/renderer
- resend
- rxjs
- socket.io
- @trigger.dev/sdk
- zod
- prisma
- require-in-the-middle
- source-map-support
- supertest
- trigger.dev
- @trigger.dev/build
- ts-jest
- ts-loader
- ts-node
- tsconfig-paths
- tsx
- @types/cookie-parser
- @types/express
- @types/jest
- @types/multer
- @types/react-dom
- @types/supertest
- typescript-eslint
- docker-database-url.sh
- strip-original-output-snapshots.mjs
- credits.dto.ts
- ASSEMBLYAI_MODELS

## God Nodes (most connected - your core abstractions)
1. `PrismaService` - 100 edges
2. `WorkspaceContextService` - 45 edges
3. `CarouselTemplateService` - 42 edges
4. `StorageService` - 34 edges
5. `scripts` - 33 edges
6. `AgentRegistryService` - 28 edges
7. `FilesService` - 28 edges
8. `AiCatalogController` - 27 edges
9. `AgentRunService` - 26 edges
10. `AgentSseService` - 25 edges

## Surprising Connections (you probably didn't know these)
- `seedPersonalSpaceForUser()` --references--> `@prisma/client`  [EXTRACTED]
  prisma/seed.ts → package.json
- `createCompanyForUser()` --references--> `@prisma/client`  [EXTRACTED]
  src/company/company-bootstrap.util.ts → package.json
- `main()` --calls--> `resolveRemotionEntryPoint()`  [EXTRACTED]
  prisma/scripts/generate-style-previews.ts → src/video/resolve-remotion-entry-point.ts
- `seedPersonalSpaceForUser()` --calls--> `ensureWorkspaceAgentFolders()`  [EXTRACTED]
  prisma/seed.ts → src/files/workspace-folders.util.ts
- `hydrateAllManifestVariations()` --calls--> `assembleSlideCss()`  [EXTRACTED]
  scripts/lib/hydrate-slides.ts → src/agents/carousel/utils/brand-theme.util.ts

## Import Cycles
- None detected.

## Communities (165 total, 66 thin omitted)

### Community 0 - "cuts-steps.ts"
Cohesion: 0.05
Nodes (69): cutsAgent, baseInput, mockLlmCuts, createCutsDevTimer(), CutsLogContext, errorCutsDev(), logCutsDev(), summarizeCuts() (+61 more)

### Community 1 - "cuts-render-clip.ts"
Cohesion: 0.05
Nodes (73): main(), prisma, buildS3Client(), deleteKeys(), encodeCopySource(), FolderRow, folderSegments(), listAllKeys() (+65 more)

### Community 2 - "company.service.ts"
Cohesion: 0.06
Nodes (39): CompaniesController, CompanyController, Body, Controller, Delete, Get, Patch, Post (+31 more)

### Community 3 - "RolesService"
Cohesion: 0.05
Nodes (25): AgentRunBlockService, Injectable, UpdateProfileDto, updateProfileDtoSchema, RolesController, Body, Controller, Delete (+17 more)

### Community 4 - "index.ts"
Cohesion: 0.07
Nodes (28): RequirePlatformRole(), AssignPlatformRoleDto, assignPlatformRoleSchema, PLATFORM_ROLES, PlatformRole, LookupUserByEmailQuery, lookupUserByEmailSchema, StartSupportSessionDto (+20 more)

### Community 5 - "root.tsx"
Cohesion: 0.08
Nodes (36): main(), SAMPLE_CAPTIONS, TEXT_STYLE_SPECS, BroadcastComposition(), CleanSplitComposition(), GlassBlurComposition(), KineticBoldComposition(), NeonWaveComposition() (+28 more)

### Community 6 - "agents.module.ts"
Cohesion: 0.09
Nodes (34): AdminModule, Module, AgentsModule, Module, AuditModule, Module, AuthModule, Module (+26 more)

### Community 7 - "AgentSseService"
Cohesion: 0.07
Nodes (21): Headers, LEGACY_STEP_REMAP, remapLegacyCarouselStepKey(), InternalEventsController, Body, Controller, HttpCode, Param (+13 more)

### Community 8 - "PrismaService"
Cohesion: 0.08
Nodes (15): CarouselAiEditController, Controller, CarouselExportController, Controller, AuditService, MockPrisma, Injectable, WriteAuditLogInput (+7 more)

### Community 9 - "AgentRunService"
Cohesion: 0.10
Nodes (23): AgentRunsController, Body, Controller, Get, HttpCode, Param, Patch, Post (+15 more)

### Community 10 - "carousel-run-deps.ts"
Cohesion: 0.09
Nodes (21): buildRegisteredAgents(), mapCapabilities(), toRegisteredAgent(), carouselAgent, baseInput, mockIdeas, mockSlides, CarouselFeedback (+13 more)

### Community 11 - "session.service.ts"
Cohesion: 0.12
Nodes (17): updateAgentConfigSchema, aiEditRequestPipe, bodySchema, CarouselRenderController, renderRequestPipe, renderRequestSchema, Controller, BlockState (+9 more)

### Community 12 - "StorageService"
Cohesion: 0.10
Nodes (20): CarouselRunDepsAdapter, Injectable, buildCarouselRunDeps(), raceWithTimeout(), resolveWorkspaceScope(), WorkspaceScope, CarouselRenderInput, CarouselRenderService (+12 more)

### Community 13 - "CreditService"
Cohesion: 0.07
Nodes (11): CreditStepInterceptor, Injectable, Injectable, WorkflowEngineService, CreditsController, Controller, Get, Req (+3 more)

### Community 14 - "text-image"
Cohesion: 0.06
Nodes (35): v4, imageSlots, imageSlots, imageSlots, imageSlots, imageSlots, imageSlots, description (+27 more)

### Community 15 - "MarketplaceService"
Cohesion: 0.12
Nodes (13): MarketplaceController, Body, Controller, Get, Param, Patch, Post, Query (+5 more)

### Community 16 - ".write"
Cohesion: 0.13
Nodes (13): AgentRunReviewService, Injectable, MembersController, Body, Controller, Delete, Get, Param (+5 more)

### Community 17 - "scripts"
Cohesion: 0.06
Nodes (33): scripts, build, carousel:gallery, carousel:previews, carousel:validate-all, carousel:validate-previews, carousel:validate-shell, carousel:validate-visual (+25 more)

### Community 18 - "FilesService"
Cohesion: 0.15
Nodes (5): FilesService, serializeFile(), serializeFolder(), Injectable, ResolvedWorkspace

### Community 19 - "normalize-slide-copy.util.ts"
Cohesion: 0.13
Nodes (22): chunkSentences(), splitLongText(), splitOversizedContentMachineCopy(), splitSentences(), applyCopyLimits(), CopyLimitsOptions, resolveLimits(), TruncatableSlideCopy (+14 more)

### Community 20 - "text"
Cohesion: 0.07
Nodes (29): dark-close, panel-list, panel-quote, imageSlots, imageSlots, imageSlots, description, dimensions (+21 more)

### Community 21 - "text-image"
Cohesion: 0.08
Nodes (28): description, dimensions, instagram, id, v1, v2, height, width (+20 more)

### Community 22 - "text"
Cohesion: 0.07
Nodes (27): pull-quote, question, imageSlots, imageSlots, imageSlots, description, dimensions, instagram (+19 more)

### Community 23 - "text"
Cohesion: 0.07
Nodes (27): description, dimensions, instagram, imageSlots, imageSlots, id, full, height (+19 more)

### Community 24 - "text"
Cohesion: 0.07
Nodes (27): description, dimensions, instagram, imageSlots, imageSlots, id, full, height (+19 more)

### Community 25 - "ai-catalog.controller.ts"
Cohesion: 0.18
Nodes (17): AiCatalogModule, Module, adjustCompanyCreditSchema, createModelSchema, createProviderSchema, platformCompaniesQuerySchema, updateAgentPolicySchema, updateAgentStepPoliciesBatchSchema (+9 more)

### Community 26 - "CarouselTemplateService"
Cohesion: 0.15
Nodes (12): CarouselTemplateService, DIR_TO_SCHEMA, resolveCarouselTemplatesRoot(), SCHEMA_TO_DIR, templatesRoot, TemplateNotFoundError, CarouselImageSlotManifest, CarouselSlideTypeManifest (+4 more)

### Community 27 - "agent-run-execute.ts"
Cohesion: 0.11
Nodes (17): setCutsRunDeps(), executeRun(), ExecutionDependencies, NoOpEventPublisher, requeueFailedAgentRun(), createStubCarouselRunDeps(), createStubCutsRunDeps(), CAROUSEL_STUB_RESPONSES (+9 more)

### Community 28 - "AiCatalogController"
Cohesion: 0.18
Nodes (10): AiCatalogController, Body, Controller, Delete, Param, Patch, Post, Req (+2 more)

### Community 29 - "agents-credits.e2e-spec.ts"
Cohesion: 0.22
Nodes (14): AuthenticatedSession, loginAsDemoBusiness(), cleanupTestDatabase(), disconnectTestDatabase(), getTestDatabaseUrl(), getTestPrisma(), runMigrations(), hashPassword() (+6 more)

### Community 30 - "generate-slides.step.ts"
Cohesion: 0.17
Nodes (21): buildSlidesSystemPrompt(), buildSlidesUserPrompt(), alignSlidesLlmOutputToContent(), buildCarouselImagePlaceholderDataUri(), buildTemplateSlidesLlmOutput(), createGenerateSlidesStep(), extractImageSlotKeys(), generatedSlideLaxSchema (+13 more)

### Community 31 - "manifest.json"
Cohesion: 0.09
Nodes (24): description, dimensions, instagram, id, v1, v2, v3, height (+16 more)

### Community 32 - "prisma.service.ts"
Cohesion: 0.14
Nodes (12): AgentStepDefinition, ReviewResult, InternalEvent, TERMINAL_EVENTS, AgentRunExecuteTask, ResumeRunOptions, RunResult, StartRunOptions (+4 more)

### Community 33 - "PoliciesService"
Cohesion: 0.14
Nodes (6): isStepModelConfigurable(), PlatformAgentsService, SPEECH_STEP_KEYS, Injectable, PoliciesService, Injectable

### Community 34 - "agent-loader.ts"
Cohesion: 0.12
Nodes (14): mapStepType(), mapToKernelAgentDefinition(), builtInAgents, defaultAgentDefinitions, AgentDefinition, AgentRunStatus, CreditDebitResult, PlatformSettings (+6 more)

### Community 35 - "FilesController"
Cohesion: 0.23
Nodes (11): FilesController, Body, Controller, Delete, Get, Param, Patch, Post (+3 more)

### Community 36 - "ProjectsService"
Cohesion: 0.15
Nodes (13): ProjectsController, Body, Controller, Delete, Get, Param, Patch, Post (+5 more)

### Community 37 - "admin.controller.ts"
Cohesion: 0.14
Nodes (13): AdminController, Body, Controller, Post, UseGuards, UsePipes, AdminService, Injectable (+5 more)

### Community 38 - "slide-template-engine.ts"
Cohesion: 0.19
Nodes (17): convertLineBreaksToBr(), escapeHtmlText(), formatCarouselCopyHtml(), sanitizeAllowedCopyHtml(), buildListHtml(), CopyDensity, escapeHtml(), hydrateSlideHtml() (+9 more)

### Community 39 - "design-plan-normalizer.ts"
Cohesion: 0.14
Nodes (20): bumpContentMachinePick(), CM_IMAGE_POSITIONS, CM_IMAGE_THEME_CYCLE, CONTENT_MACHINE_IMAGE_CYCLE, CONTENT_MACHINE_TEXT_CYCLE, ContentMachineLayoutPick, hasImageIntent(), normalizeContentMachineSlide() (+12 more)

### Community 40 - "app.controller.ts"
Cohesion: 0.13
Nodes (11): AppController, Controller, Get, Public, AppService, Injectable, AuthGuard, Injectable (+3 more)

### Community 41 - "seed.ts"
Cohesion: 0.17
Nodes (19): ADMIN_USER, hashPassword(), main(), MARKETPLACE_SEED, MARKETPLACE_SEED_SLUGS, seedFreeTextStyleEntitlements(), seedMarketplaceItems(), textStylePreviewPath() (+11 more)

### Community 42 - "generate-content.step.ts"
Cohesion: 0.20
Nodes (15): buildContentSystemPrompt(), buildContentUserPrompt(), resolveSelectedIdea(), contentLlmOutputZod, contentSlideLaxSchema, createGenerateContentStep(), finalizeContentSlides(), mapLlmSlidesToContent() (+7 more)

### Community 43 - "validate-carousel-templates.ts"
Cohesion: 0.16
Nodes (19): ALLOWED_PLACEHOLDERS, CONTENT_MACHINE_THEME_CLASSES, EDITOR_LAYER_TEMPLATE_IDS, EDITORIAL_THEME_CLASSES, extractCarouselLayerValues(), extractPlaceholders(), formatTemplateValidationReport(), isEditorLayerTemplate() (+11 more)

### Community 44 - "Slide library"
Cohesion: 0.10
Nodes (19): Content contract, Global components, `image/v1` — Full bleed + overlay text, `image/v2` — Split composition, `image/v3` — Minimal caption, Minimal Clean — Template Instructions, Narrative mapping, Palette (+11 more)

### Community 45 - "validate-template-previews.ts"
Cohesion: 0.20
Nodes (15): hydratePreviewSampleSlides(), wrapSlideDocument(), collectSlideLayoutMetrics(), LayoutIssue, layoutMetricsToIssues(), SlideLayoutMetrics, PREVIEW_SAMPLES, arg() (+7 more)

### Community 46 - "preview-samples.ts"
Cohesion: 0.25
Nodes (10): contentMachine, daylight, editorialPerformance, minimalClean, reel, spotlight, SampleBrand, SampleSet (+2 more)

### Community 47 - "agent-execution.kernel.ts"
Cohesion: 0.17
Nodes (12): buildAgentStepExecutors(), createPrismaRunStore(), runInclude, RunWithRelations, wrapSdkStep(), CustomStepExecutor, ExecuteRunParams, ImageProvider (+4 more)

### Community 48 - ".resolveFromRequest"
Cohesion: 0.16
Nodes (10): AgentsController, Body, Controller, Get, HttpCode, Param, Post, Query (+2 more)

### Community 49 - "Slide library"
Cohesion: 0.11
Nodes (18): Composition rules, Editorial Performance — Template Instructions, Global components (every slide), `image/v1`, `image/v2`, Injectable variables, Palette, Slide library, `start/v1` — Hero cover (`slide_start`) (+10 more)

### Community 50 - "index.ts"
Cohesion: 0.20
Nodes (10): EmailModule, Global, Module, EMAIL_PORT, EmailPort, SendEmailOptions, SendEmailResult, ResendEmailAdapter (+2 more)

### Community 51 - "exclude"
Cohesion: 0.11
Nodes (17): dist, node_modules, ../../packages/authz/dist/index.d.ts, ../../packages/types/dist/index.d.ts, **/*spec.ts, test, trigger/**/*, compilerOptions (+9 more)

### Community 52 - "compilerOptions"
Cohesion: 0.11
Nodes (17): ../../packages/configs/tsconfig.nest.json, test/**/*.ts, compilerOptions, baseUrl, module, moduleResolution, noEmit, outDir (+9 more)

### Community 53 - "carousel-ai-edit.service.ts"
Cohesion: 0.16
Nodes (10): aiEditRequestSchema, aiEditResultSchema, CarouselAiEditRequest, CarouselAiEditResult, CarouselAiEditService, SYSTEM_PROMPT, Inject, Injectable (+2 more)

### Community 54 - "seed-ai-catalog.ts"
Cohesion: 0.19
Nodes (16): ANTHROPIC_MODELS, ASSEMBLYAI_LLM_MODELS, ASSEMBLYAI_STT_MODELS, fetchAssemblyAiLlmModels(), fetchGeminiModels(), fetchOpenRouterModels(), GEMINI_MODELS, inferGeminiCapabilities() (+8 more)

### Community 55 - "slides-generation-context.ts"
Cohesion: 0.16
Nodes (12): normalizeInstagramHandle(), ResolveBrandInput, resolveCarouselBrandContext(), resolveContentMachineVariations(), SlideInput, TEXT_IMAGE_POSITIONS, TEXT_IMAGE_THEMES, TEXT_MIDDLE_VARIATIONS (+4 more)

### Community 56 - "personal-space.controller.ts"
Cohesion: 0.16
Nodes (9): PersonalSpaceController, Controller, Get, Req, RequirePermission, PersonalSpaceModule, Module, PersonalSpaceService (+1 more)

### Community 57 - "validate-template-shell.ts"
Cohesion: 0.23
Nodes (12): issues, isCoverVariation(), resolveSpotlightHeaderSelectors(), TEMPLATE_SHELL_RULES, TemplateShellRule, variationKey(), resolveManifestSlideTypes(), resolveVariationIds() (+4 more)

### Community 58 - ".error"
Cohesion: 0.25
Nodes (11): createUsageReporter(), logger, createDevTelemetryProvider(), DevAgentLogger, isDevEnvironment(), isVerboseAgentDevLogging(), summarizeEventData(), wrapEventPublisherForDev() (+3 more)

### Community 59 - "Reel — Template Instructions"
Cohesion: 0.12
Nodes (15): Content contract, Copy density, Global components, Highlight rules, `image/cinematic` — Pure photo, Narrative mapping, Palette, Reel — Template Instructions (+7 more)

### Community 60 - "validate-visual-all.ts"
Cohesion: 0.20
Nodes (13): AiPatternHit, AiPatternSeverity, BLOCKING_RULES, hasBlockingAiPatterns(), lintCssForAiPatterns(), WARNING_RULES, HydratedSlide, arg() (+5 more)

### Community 61 - "getCarouselRunDeps"
Cohesion: 0.24
Nodes (12): Get, Req, RequirePermission, getCarouselRunDeps(), buildDesignPlanSystemPrompt(), buildDesignPlanUserPrompt(), createGenerateDesignPlanStep(), designPlanLlmOutputZod (+4 more)

### Community 62 - "Daylight — Template Instructions"
Cohesion: 0.13
Nodes (14): Content contract, Copy density, Daylight — Template Instructions, Global components (every slide), Highlight rules, `image/full` — Full-bleed card, Narrative mapping, Palette (+6 more)

### Community 63 - "Spotlight — Template Instructions"
Cohesion: 0.13
Nodes (14): Content contract, Copy density, Global components, Highlight rules, `image/full`, Narrative mapping, Palette, Rhythm rules (+6 more)

### Community 64 - "Voltage — Template Instructions"
Cohesion: 0.13
Nodes (14): Content contract, Copy density, Global components (every slide), Highlight rules, `image/full`, Narrative mapping, Palette, Rhythm rules (+6 more)

### Community 65 - "provider-error-message.ts"
Cohesion: 0.22
Nodes (9): LlmProvider, extractProviderDetail(), formatProviderExecutionError(), getProviderLabel(), isTransientUserFacingProviderError(), PROVIDER_LABELS, toUserFacingProviderError(), createTriggerLlmProvider() (+1 more)

### Community 66 - "dependencies"
Cohesion: 0.15
Nodes (13): @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, @better-auth/prisma-adapter, @nestjs/platform-socket.io, @nestjs/websockets, dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner (+5 more)

### Community 67 - "jest"
Cohesion: 0.15
Nodes (13): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+5 more)

### Community 68 - "hydrate-slides.ts"
Cohesion: 0.38
Nodes (11): buildMinimalSlideContent(), dataUriFromSampleDir(), DEFAULT_BRAND, hydrateAllManifestVariations(), IMAGE_POOL, listAllTemplateIds(), resolveCanvasSize(), resolveVariationIds() (+3 more)

### Community 69 - "AgentCatalogController"
Cohesion: 0.21
Nodes (7): AgentCatalogController, Body, Controller, Get, Param, Patch, RequirePermission

### Community 70 - "ModelsService"
Cohesion: 0.15
Nodes (4): Get, Query, ModelsService, Injectable

### Community 71 - "WorkspaceSettingsService"
Cohesion: 0.22
Nodes (3): serializeSettings(), Injectable, WorkspaceSettingsService

### Community 73 - "register-better-auth.ts"
Cohesion: 0.26
Nodes (9): beginPasswordResetUrlCapture(), deliverPasswordResetEmail(), logger, ResetPasswordPayload, AuthInstance, getAuthInstance(), logger, PasswordResetResult (+1 more)

### Community 74 - "WorkspaceSettingsController"
Cohesion: 0.32
Nodes (8): Body, Controller, Get, Param, Patch, Req, RequirePermission, WorkspaceSettingsController

### Community 75 - "assert-sse-events.ts"
Cohesion: 0.17
Nodes (5): RagDocumentAssertion, assertRunCompletedEvent(), assertSseEventSequence(), CollectedSseEvent, SseEventSequenceAssertion

### Community 76 - "Content Machine — Template Instructions"
Cohesion: 0.18
Nodes (10): Content contract, Content Machine — Template Instructions, Copy density, Layout library — vary every slide, Narrative mapping, Rhythm rules, `start/v1` — Cover, Text + image — `posição-tema` (+2 more)

### Community 77 - "brand-theme.util.ts"
Cohesion: 0.40
Nodes (9): applyBrandThemeToCss(), assembleSlideCss(), buildAccentCssOverride(), DEFAULT_ACCENT_HEXES, lightenHex(), parseHex(), softenBorderHex(), brand (+1 more)

### Community 78 - "content-slides-normalizer.ts"
Cohesion: 0.33
Nodes (9): hasImageIntent(), isListHeavy(), isTextHeavy(), NormalizableContentSlide, normalizeContentSlides(), padContentSlidesToCount(), resolveMiddleSlideType(), splitIdeaPoints() (+1 more)

### Community 79 - "README.md"
Cohesion: 0.20
Nodes (9): Compile and run the project, Deployment, Description, License, Project setup, Resources, Run tests, Stay in touch (+1 more)

### Community 80 - "tsconfig.trigger.json"
Cohesion: 0.20
Nodes (9): trigger/**/*.ts, compilerOptions, noEmit, rootDir, extends, include, src/**/*.ts, trigger.config.ts (+1 more)

### Community 83 - "biome.json"
Cohesion: 0.22
Nodes (8): extends, linter, rules, style, $schema, noNonNullAssertion, useImportType, ../../biome.json

### Community 84 - "devDependencies"
Cohesion: 0.22
Nodes (9): @biomejs/biome, devDependencies, @biomejs/biome, @types/node, @types/react, typescript, @types/node, @types/react (+1 more)

### Community 85 - ".exportRun"
Cohesion: 0.22
Nodes (7): jszip, jszip, Res, Get, Param, Req, RequirePermission

### Community 86 - "package.json"
Cohesion: 0.22
Nodes (8): author, description, license, name, prisma, seed, private, version

### Community 87 - "serve-template-gallery.ts"
Cohesion: 0.33
Nodes (8): escapeHtml(), handleRequest(), PORT, renderGalleryIndex(), renderSlidePage(), service, slideIndex, slides

### Community 88 - "AppModule"
Cohesion: 0.36
Nodes (6): AppModule, Module, registerBetterAuth(), ALLOWED_LEVELS, resolveNestLogLevels(), bootstrap()

### Community 89 - "rag-index-document.ts"
Cohesion: 0.25
Nodes (7): agentRunExecute, cutsRenderClip, IngestPayload, ingestPayloadSchema, prisma, ragIndexDocument, sdk

### Community 91 - "nest-cli.json"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, assets, deleteOutDir, $schema, sourceRoot

### Community 92 - "carousel-templates.controller.ts"
Cohesion: 0.33
Nodes (5): ACCENT_BY_TEMPLATE, buildVariations(), CarouselTemplatesController, previewFileName(), Controller

### Community 93 - "plain-text.util.ts"
Cohesion: 0.52
Nodes (5): convertAllowedHtmlToMarkers(), decodeHtmlEntities(), HTML_ENTITY_MAP, normalizeCarouselSlideCopy(), toCarouselPlainText()

### Community 94 - "agent-skills.loader.ts"
Cohesion: 0.43
Nodes (5): AgentSkillDefinition, loadAgentSkill(), loadAgentSkills(), parseFrontmatter(), resolveSkillDirectory()

### Community 96 - "agent-run.fixture.ts"
Cohesion: 0.29
Nodes (3): AgentId, agentRunInputFixtures, agentRunOutputFixtures

### Community 97 - "generate-ideas.step.ts"
Cohesion: 0.60
Nodes (4): buildIdeasSystemPrompt(), buildIdeasUserPrompt(), createGenerateIdeasStep(), ideasLlmOutputZod

### Community 98 - "assert-credit-ledger.ts"
Cohesion: 0.40
Nodes (4): assertCreditLedger(), CreditAssertion, CreditSnapshot, getCreditSnapshot()

### Community 100 - "CutsRunDepsAdapter"
Cohesion: 0.40
Nodes (3): CutsRunDepsAdapter, Inject, Injectable

### Community 103 - "@prisma/client"
Cohesion: 0.67
Nodes (3): @prisma/client, @prisma/client, debitStepCredits()

## Knowledge Gaps
- **585 isolated node(s):** `$schema`, `../../biome.json`, `useImportType`, `noNonNullAssertion`, `docker-entrypoint.sh script` (+580 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **66 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `@openrouter/sdk`, `pdf-parse`, `puppeteer`, `react-dom`, `reflect-metadata`, `remotion`, `@remotion/bundler`, `@remotion/renderer`, `resend`, `rxjs`, `socket.io`, `@trigger.dev/sdk`, `zod`, `.exportRun`, `package.json`, `@prisma/client`, `@aws-sdk/lib-storage`, `better-auth`, `@better-auth/utils`, `@company-os/agent-ia-sdk`, `@company-os/authz`, `@company-os/db`, `@company-os/types`, `cookie-parser`, `ffmpeg-static`, `multer`, `@nestjs/common`, `@nestjs/config`, `@nestjs/core`, `@nestjs/platform-express`, `@openrouter/agent`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Why does `PrismaService` connect `PrismaService` to `cuts-steps.ts`, `cuts-render-clip.ts`, `company.service.ts`, `RolesService`, `index.ts`, `agents.module.ts`, `AgentSseService`, `session.service.ts`, `StorageService`, `CreditService`, `MarketplaceService`, `.write`, `ai-catalog.controller.ts`, `agent-run-execute.ts`, `prisma.service.ts`, `PoliciesService`, `admin.controller.ts`, `carousel-ai-edit.service.ts`, `ModelsService`, `AgentRegistryService`, `register-better-auth.ts`, `AppModule`, `ProvidersService`, `AdminGuard`, `CutsRunDepsAdapter`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Why does `CarouselTemplateService` connect `CarouselTemplateService` to `prisma.service.ts`, `hydrate-slides.ts`, `agents.module.ts`, `carousel-run-deps.ts`, `validate-carousel-templates.ts`, `StorageService`, `validate-template-previews.ts`, `carousel-templates.controller.ts`, `carousel-ai-edit.service.ts`, `serve-template-gallery.ts`, `validate-template-shell.ts`, `agent-run-execute.ts`, `validate-visual-all.ts`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **What connects `$schema`, `../../biome.json`, `useImportType` to the rest of the system?**
  _585 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cuts-steps.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05274725274725275 - nodes in this community are weakly interconnected._
- **Should `cuts-render-clip.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.054431960049937576 - nodes in this community are weakly interconnected._
- **Should `company.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05673274094326726 - nodes in this community are weakly interconnected._