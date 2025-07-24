import React, { useState, useEffect } from 'react';

const colors = {
  primaryPink: '#ff2e63',
  lightGrey: '#eaeaea',
  slateBlue: '#3a4252',
  deepBlack: '#101216',
  accentPink: '#ff6189',
};

const initialCoreQuestions = [
  "Describe your current professional role and primary responsibilities.",
  "What are your top 3 career aspirations for the next 5 years?",
  "What specific skills or knowledge areas do you believe are most critical for your career growth in your industry?",
  "What is the biggest challenge you foresee in achieving your career goals?",
  "How do you currently approach professional development and learning new skills?"
];

const App = () => {
  const [currentPage, setCurrentPage] = useState('intro');
  const [userProfile, setUserProfile] = useState({ role: '', industry: '' });
  const [answers, setAnswers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentInput, setCurrentInput] = useState('');

  useEffect(() => {
    setQuestions(initialCoreQuestions);
  }, []);

  const handleStartAssessment = () => {
    setShowProfileModal(true);
  };

  const handleSaveProfile = () => {
    if (userProfile.role && userProfile.industry) {
      setShowProfileModal(false);
      setCurrentPage('assessment');
    }
  };

  const handleSubmitAnswer = async (question, answer) => {
    if (!answer.trim()) return;

    const updatedAnswers = [...answers, { question, answer }];
    setAnswers(updatedAnswers);
    setCurrentInput('');

    if (currentQuestionIndex < initialCoreQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setCurrentPage('results');
      setAiReport("Your personalized career report will be generated here. This is a simplified version to ensure deployment works.");
    }
  };

  const modalOverlayStyle = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
  const modalContentStyle = "bg-white p-6 rounded-lg shadow-xl max-w-lg w-full mx-4";

  const renderPage = () => {
    switch (currentPage) {
      case 'intro':
        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: colors.deepBlack, color: colors.lightGrey }}>
            <div className="p-8 rounded-xl shadow-2xl max-w-2xl text-center" style={{ backgroundColor: colors.lightGrey, color: colors.deepBlack }}>
              <h1 className="text-4xl font-extrabold mb-6" style={{ color: colors.primaryPink }}>Career Readiness Assessment</h1>
              <p className="text-lg mb-4 leading-relaxed">
                Welcome to your personalized career readiness journey! This tool uses advanced AI to adapt questions based on your responses.
              </p>
              <p className="text-lg mb-8 leading-relaxed">
                You'll receive a comprehensive report with insights tailored specifically for your role and aspirations.
              </p>
              <button
                onClick={handleStartAssessment}
                className="font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                style={{ backgroundColor: colors.primaryPink, color: 'white' }}
              >
                Start Assessment
              </button>
            </div>
          </div>
        );

      case 'assessment':
        const currentQuestion = questions[currentQuestionIndex];
        const isAnswerEmpty = !currentInput.trim();

        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: colors.deepBlack, color: colors.lightGrey }}>
            <div className="p-8 rounded-xl shadow-2xl max-w-2xl w-full" style={{ backgroundColor: colors.lightGrey, color: colors.deepBlack }}>
              <h2 className="text-3xl font-bold mb-6 text-center" style={{ color: colors.primaryPink }}>
                Assessment: Question {currentQuestionIndex + 1} of {questions.length}
              </h2>
              <div className="mb-6">
                <label className="block text-lg font-medium mb-2" style={{ color: colors.slateBlue }}>
                  {currentQuestion}
                </label>
                <textarea
                  rows="5"
                  className="w-full p-3 border rounded-lg resize-y"
                  style={{ borderColor: colors.slateBlue, color: colors.deepBlack, backgroundColor: 'white' }}
                  placeholder="Type your answer here..."
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                />
              </div>
              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
                    setCurrentInput(answers[currentQuestionIndex - 1]?.answer || '');
                  }}
                  disabled={currentQuestionIndex === 0 || isLoading}
                  className="font-bold py-2 px-6 rounded-full transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: colors.slateBlue, color: 'white' }}
                >
                  Previous
                </button>
                <button
                  onClick={() => handleSubmitAnswer(currentQuestion, currentInput)}
                  disabled={isLoading || isAnswerEmpty}
                  className="font-bold py-2 px-6 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: colors.primaryPink, color: 'white' }}
                >
                  {isLoading ? 'Generating...' : (currentQuestionIndex === questions.length - 1 ? 'Finish Assessment' : 'Next')}
                </button>
              </div>
            </div>
          </div>
        );

      case 'results':
        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: colors.deepBlack, color: colors.lightGrey }}>
            <div className="p-8 rounded-xl shadow-2xl max-w-3xl w-full" style={{ backgroundColor: colors.lightGrey, color: colors.deepBlack }}>
              <h2 className="text-3xl font-bold mb-6 text-center" style={{ color: colors.primaryPink }}>Your Personalized Career Report</h2>
              <div className="prose max-w-none leading-relaxed mb-8 overflow-y-auto max-h-96 p-4 border rounded-lg" style={{ borderColor: colors.slateBlue, color: colors.deepBlack }}>
                <h3 style={{ color: colors.slateBlue }}>Assessment Complete!</h3>
                <p>Thank you for completing the assessment. Your responses have been recorded:</p>
                <ul>
                  {answers.map((item, index) => (
                    <li key={index} className="mb-2">
                      <strong>Q{index + 1}:</strong> {item.question}
                      <br />
                      <strong>A:</strong> {item.answer}
                    </li>
                  ))}
                </ul>
                <p style={{ color: colors.primaryPink }}>
                  <strong>Next Steps:</strong> This simplified version confirms your deployment works. 
                  You can now add back the AI features once the basic app is successfully deployed.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="App">
      {renderPage()}

      {showProfileModal && (
        <div className={modalOverlayStyle}>
          <div className={modalContentStyle} style={{ backgroundColor: colors.lightGrey, color: colors.deepBlack }}>
            <h3 className="text-2xl font-bold mb-4" style={{ color: colors.primaryPink }}>Tell Us About Yourself</h3>
            <p className="mb-4">This helps us personalize your assessment and report.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1" style={{ color: colors.slateBlue }}>Your Current Role:</label>
              <input
                type="text"
                value={userProfile.role}
                onChange={(e) => setUserProfile({ ...userProfile, role: e.target.value })}
                className="w-full p-2 border rounded-md"
                style={{ borderColor: colors.slateBlue, color: colors.deepBlack, backgroundColor: 'white' }}
                placeholder="e.g., Software Engineer, Marketing Manager"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1" style={{ color: colors.slateBlue }}>Your Industry:</label>
              <input
                type="text"
                value={userProfile.industry}
                onChange={(e) => setUserProfile({ ...userProfile, industry: e.target.value })}
                className="w-full p-2 border rounded-md"
                style={{ borderColor: colors.slateBlue, color: colors.deepBlack, backgroundColor: 'white' }}
                placeholder="e.g., Tech, Healthcare, Finance"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              className="font-bold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out"
              style={{ backgroundColor: colors.primaryPink, color: 'white' }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
