# Compliance Copilot Services

This directory contains the backend services that power the Compliance Copilot application.

## Gap Analysis Service

The gap analysis service analyzes emergency plans against reference standards to identify compliance gaps and suggest improvements.

### Importance Level Criteria

When analyzing plans, recommendations are assigned an importance level based on the following criteria:

#### High Priority
- Elements directly related to life safety or critical functionality
- Requirements mandated by laws or regulations
- Essential plan elements without which the plan would fail in an emergency
- Core requirements from standard frameworks (NFPA 1600, FEMA CPG 101, etc.)
- All elements marked as "critical" in the analysis

#### Medium Priority  
- Important elements that should be addressed but aren't immediately critical
- Standard requirements that would enhance the plan's effectiveness
- Best practices widely adopted in the industry
- Elements that improve coordination, communication, or resource management
- Non-critical missing elements

#### Low Priority
- Minor improvements or optimizations
- Formatting or organizational suggestions
- Best practices that exceed minimum requirements
- Nice-to-have elements that would enhance the plan but aren't strictly required

## AI Services

The application uses Gemini AI models for:
1. Gap analysis - analyzing plans against reference standards
2. Copilot - answering user questions about emergency management

See the AI prompt templates in `gemini.js` for more details on how these services work.