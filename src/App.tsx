import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { HomePage } from './pages/HomePage';
import { CardCreatorPage } from './pages/CardCreatorPage';
import { CardLibraryPage } from './pages/CardLibraryPage';
import { DeckBuilderPage } from './pages/DeckBuilderPage';
import { PlayPage } from './pages/PlayPage';
import { AiOpponentsPage } from './pages/AiOpponentsPage';
import { TournamentsPage } from './pages/TournamentsPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/creator" element={<CardCreatorPage />} />
          <Route path="/library" element={<CardLibraryPage />} />
          <Route path="/deck-builder" element={<DeckBuilderPage />} />
          <Route path="/ai-opponents" element={<AiOpponentsPage />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/play" element={<PlayPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
