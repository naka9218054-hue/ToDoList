/**
 * ToDoList Web App - Playwright E2E Automated Test Suite
 * 
 * Run test:
 *   npx playwright test test_e2e.spec.js
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';

test.describe('ToDoList Web App E2E Test Suite', () => {

    test.beforeEach(async ({ page }) => {
        // 1. ページへのアクセス
        await page.goto(BASE_URL);
        await expect(page).toHaveTitle(/ToDo List アプリ/);
    });

    test('1. 初期表示の要素検証', async ({ page }) => {
        // ヘッダータイトルの検証
        const headerTitle = page.locator('.brand-section h1');
        await expect(headerTitle).toHaveText('TaskFlow');

        // 入力フィールドの存在確認
        const inputField = page.locator('#task-title-input');
        await expect(inputField).toBeVisible();
    });

    test('2. タスク追加フロー', async ({ page }) => {
        const testTaskTitle = `自動テストタスク_${Date.now()}`;

        // タスク名を入力
        await page.fill('#task-title-input', testTaskTitle);

        // カテゴリと優先度を選択
        await page.selectOption('#task-category-select', '仕事');
        await page.selectOption('#task-priority-select', 'high');

        // 「追加する」ボタンをクリック
        await page.click('#task-form button[type="submit"]');

        // タスク一覧に新タスクが表示されたことを検証
        const newTaskCard = page.locator(`.task-card:has-text("${testTaskTitle}")`);
        await expect(newTaskCard).toBeVisible({ timeout: 5000 });
    });

    test('3. 検索フィルター動作テスト', async ({ page }) => {
        const searchInput = page.locator('#search-input');
        await searchInput.fill('立山');

        // 検索結果の絞り込み検証
        const taskCards = page.locator('.task-card');
        await expect(taskCards.first()).toContainText('立山');
    });

    test('4. フィルタートグル動作（すべて / 未完了 / 完了済み）', async ({ page }) => {
        // 「未完了」フィルタークリック
        await page.click('.filter-pills button[data-filter="active"]');
        
        // アクティブクラスが付与されたか確認
        const activeFilterBtn = page.locator('.filter-pills button[data-filter="active"]');
        await expect(activeFilterBtn).toHaveClass(/active/);
    });

});
