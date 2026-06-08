import { handleOptions, sendJson } from './_lib/http.js';
import { requireFirebaseAuth } from './_lib/firebase-auth.js';
import {
  analyzeEngineeringDrawing,
  analyzeStructuralFile,
  generateProjectSummary,
  generateRateInsight,
  generateRateBreakdown,
} from './_lib/ai-provider.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return sendJson(req, res, 405, { error: 'Method not allowed.' });
  }

  try {
    const authClaims = await requireFirebaseAuth(req);
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const action = String(body.action || '').trim();
    const preferredProvider = String(body.preferredProvider || '').trim();
    const model = String(body.model || '').trim();
    const uid = String(authClaims?.user_id || authClaims?.sub || body.uid || '').trim();
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();

    let result;

    switch (action) {
      case 'rate-insight':
        result = await generateRateInsight({ item: body.item, context: body.context, preferredProvider, model, uid, ip });
        break;
      case 'rate-breakdown':
        result = await generateRateBreakdown({ item: body.item, context: body.context, preferredProvider, model, uid, ip });
        break;
      case 'project-summary':
        result = await generateProjectSummary({ projectData: body.projectData, preferredProvider, model, uid, ip });
        break;
      case 'drawing-analysis':
        result = await analyzeEngineeringDrawing({
          base64Image: body.base64Image,
          contextHint: body.contextHint,
          preferredProvider,
          model,
          uid,
          ip,
        });
        break;
      case 'structural-file':
        result = await analyzeStructuralFile({
          fileContent: body.fileContent,
          fileName: body.fileName,
          preferredProvider,
          model,
          uid,
          ip,
        });
        break;
      default:
        return sendJson(req, res, 400, { error: 'Unknown AI action.' });
    }

    return sendJson(req, res, 200, {
      success: true,
      action,
      result,
    });
  } catch (error) {
    return sendJson(req, res, Number(error.status || 500), {
      error: error.message || 'AI request failed.',
    });
  }
}
