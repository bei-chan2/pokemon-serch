import { expect, test, type Page } from '@playwright/test';

const loadingText = '読み込み中...';
const questionText = 'このポケモンはだれ？';

function answerButtons(page: Page) {
  return page.locator('div.grid.grid-cols-2 button');
}

async function waitForQuizReady(page: Page) {
  await page.getByText(loadingText).waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => {
    // In rare cases loading disappears before assertion starts.
  });
  await expect(page.getByText(questionText)).toBeVisible({ timeout: 45_000 });
  await expect(answerButtons(page)).toHaveCount(4, { timeout: 45_000 });
}

async function readScore(page: Page): Promise<number> {
  const scoreText = await page.getByText(/スコア:\s*\d+/).innerText();
  const matched = scoreText.match(/(\d+)/);
  return matched ? Number(matched[1]) : 0;
}

test.describe('/quiz E2E', () => {
  test('ページ表示とローディング表示', async ({ page }) => {
    await page.goto('/quiz');

    await expect(page.getByText(loadingText)).toBeVisible({ timeout: 15_000 });
    await waitForQuizReady(page);
    await expect(page.getByRole('heading', { name: 'ポケモンクイズ' })).toBeVisible();
  });

  test('クイズ表示: 画像・4択・日本語ボタン', async ({ page }) => {
    await page.goto('/quiz');
    await waitForQuizReady(page);

    await expect(page.locator('img[alt="pokemon"]')).toBeVisible();
    await expect(answerButtons(page)).toHaveCount(4);

    const labels = await answerButtons(page).allInnerTexts();
    for (const label of labels) {
      expect(label.trim()).toMatch(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u);
    }
  });

  test('回答時フィードバックと詳細情報表示', async ({ page }) => {
    await page.goto('/quiz');
    await waitForQuizReady(page);

    await answerButtons(page).first().click();

    await expect(
      page.getByText('✓ せいかい！').or(page.getByText('✗ ざんねん！'))
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText('基本ステータス')).toBeVisible();
    await expect(page.getByText('とくせい')).toBeVisible();
    await expect(page.getByText('おぼえるわざ')).toBeVisible();
  });

  test('次の問題へ遷移とスコア挙動', async ({ page }) => {
    await page.goto('/quiz');
    await waitForQuizReady(page);

    const scoreBefore = await readScore(page);
    await answerButtons(page).first().click();

    const isCorrect = await page.getByText('✓ せいかい！').isVisible();
    const scoreAfterAnswer = await readScore(page);
    if (isCorrect) {
      expect(scoreAfterAnswer).toBe(scoreBefore + 1);
    } else {
      expect(scoreAfterAnswer).toBe(scoreBefore);
    }

    await page.getByRole('button', { name: /次の問題へ/ }).click();
    await waitForQuizReady(page);

    await expect(page.getByText(questionText)).toBeVisible();
    await expect(page.getByRole('button', { name: /次の問題へ/ })).toBeHidden();
  });
});
