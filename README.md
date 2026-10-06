# RhymASL

RhymASL is a research prototype for exploring phonologically related American Sign Language (ASL) signs and supporting the creation of short rhyming ASL stories. The system was developed as a technology probe to investigate how interactive technologies might support ASL rhyme exploration and family-centered language play.

## Repository Status

This repository currently provides the **frontend implementation** of the RhymASL research prototype. The full research codebase, including the **backend processing** described below, will be released upon publication of the associated paper.

### ASL-LEX Data

ASL-LEX data and videos are **not distributed in this repository**. RhymASL uses ASL-LEX for lexical, phonological, and sign-video information. We gratefully acknowledge ASL-LEX as an important resource supporting this work and the broader ASL research community.

Researchers interested in using ASL-LEX should obtain the dataset directly from the official source:

[https://asl-lex.org/download.html](https://asl-lex.org/download.html)

Please follow the ASL-LEX terms of use, licensing requirements, and citation guidelines.

## System Overview

RhymASL supports two main interactions:

1. **Phonological sign exploration**
   Users can select a sign and explore other signs that share phonological features, including handshape, movement, location, or combinations of these features.

2. **Story ideation with related signs**
   Users can select phonologically related signs and generate a short story sentence incorporating the selected signs. Generated sentences can be further edited by the user. The prototype also generates an illustration for each story sentence to provide visual context during story exploration.

## System Architecture

The RhymASL research prototype consists of:

- **Frontend:** React interface using Material UI
- **Backend:** FastAPI-based processing and retrieval pipeline
- **Language generation:** OpenAI GPT-4.1 mini
- **Image generation:** FLUX.1 [schnell]
- **Sign resource:** ASL-LEX

The frontend communicates with the backend to support sign retrieval, phonological sign exploration, story generation, and media presentation.

## Frontend

### Requirements

- Node.js 18+
- npm

### Installation

From the repository root:

```bash
cd frontend
npm install
npm start
```

The development server will run at:

```text
http://localhost:3000
```

The current release does not include the backend source code. Therefore, functionality requiring backend services, including sign retrieval and content generation, will not operate when the frontend is run independently.

## Backend

The backend used in the research prototype is implemented with FastAPI and supports the processing and retrieval functions described above. The backend source code will be included in the full code release.

Once the full codebase is available, the backend can be run as follows.

### Requirements

- Python 3.10 or 3.11
- The Python packages listed below (installed from `requirements.txt` in the full release)

```text
fastapi==0.118.0
uvicorn[standard]==0.37.0
numpy==1.26.4
pandas==2.3.3
scikit-learn==1.7.2
torch==2.2.2
transformers==4.57.0
nltk==3.9.2
openai==2.1.0
contractions==0.1.73
num2words==0.5.14
python-jose[cryptography]==3.5.0
python-dotenv==1.1.1
requests==2.32.5
replicate==0.32.0
```

These packages support the FastAPI server, ASL-LEX table handling, phonological retrieval, embedding-based similarity, ASL production, JWT authentication, and image generation.


### Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Start the FastAPI server:

```bash
python main.py
```

The backend will run at:

```text
http://localhost:8000
```

## Data and External Resources

Third-party data and API credentials are not included in this repository. RhymASL uses the following external resources and services:

- **ASL-LEX:** lexical, phonological, and sign-video resources
- **OpenAI API:** language generation
- **Replicate API:** FLUX.1 [schnell] image generation

## Code and Data Availability

The frontend implementation is currently available in this repository. The full research codebase, including the backend processing and retrieval pipeline used in the study, will be released upon publication of the associated paper.

Participant interview data and study-session recordings are not publicly available because of participant privacy and research-protocol restrictions.

## Research Context

RhymASL was developed as part of research on interactive technologies for ASL language play at the University of Rochester.
